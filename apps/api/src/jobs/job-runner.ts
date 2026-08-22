import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { JobRunView } from "@tcg/types";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorTrackingService } from "../observability/error-tracking.service";
import { currentRequestId } from "../observability/request-context";
import { safeErrorMessage } from "../observability/redact";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toView(row: {
  id: string;
  jobName: string;
  status: JobRunView["status"];
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  correlationId: string | null;
}): JobRunView {
  return {
    id: row.id,
    jobName: row.jobName,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    durationMs: row.durationMs,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    correlationId: row.correlationId,
  };
}

@Injectable()
export class JobRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly errors: ErrorTrackingService,
  ) {}

  async run(jobName: string, work: () => Promise<Record<string, unknown> | void>): Promise<JobRunView> {
    const startedAt = new Date();
    const correlationId = currentRequestId() ?? randomUUID();
    const id = randomUUID();
    try {
      await this.prisma.jobRun.create({
        data: {
          id,
          jobName,
          status: "RUNNING",
          startedAt,
          correlationId,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const skipped = await this.prisma.jobRun.create({
          data: {
            jobName,
            status: "SKIPPED",
            startedAt,
            finishedAt: new Date(),
            durationMs: 0,
            errorCode: "JOB_ALREADY_RUNNING",
            errorMessage: "Otra ejecución del mismo job está en curso",
            correlationId,
            metadata: { skipped: true },
          },
        });
        return toView(skipped);
      }
      throw error;
    }

    try {
      const metadata = (await work()) ?? {};
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const row = await this.prisma.jobRun.update({
        where: { id },
        data: {
          status: "COMPLETED",
          finishedAt,
          durationMs,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
      return toView(row);
    } catch (error) {
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const errorCode = error instanceof Error ? error.name : "JOB_FAILED";
      await this.prisma.jobRun.update({
        where: { id },
        data: {
          status: "FAILED",
          finishedAt,
          durationMs,
          errorCode,
          errorMessage: safeErrorMessage(error),
        },
      });
      this.errors.capture(error, { jobName, correlationId });
      const failed = await this.prisma.jobRun.findUniqueOrThrow({ where: { id } });
      return toView(failed);
    }
  }

  async failStale(olderThanMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const result = await this.prisma.jobRun.updateMany({
      where: { status: "RUNNING", startedAt: { lt: cutoff } },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorCode: "JOB_STALE",
        errorMessage: "Job RUNNING marcado stale en shutdown o housekeeping",
      },
    });
    return result.count;
  }

  toView = toView;
}
