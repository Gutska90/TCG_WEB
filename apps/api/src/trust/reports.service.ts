import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES, PLATFORM } from "@tcg/config";
import type {
  AdminReportDetailView,
  Paginated,
  ReportDetailView,
  ReportListItem,
} from "@tcg/types";
import type { AdminReportResolveInput, AdminReportsQuery, CreateReportInput } from "@tcg/validation";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";
import { MetricsService } from "../observability/metrics.service";
import { PrismaService } from "../prisma/prisma.service";
import { ModerationLogService } from "./moderation-log.service";
import { sanitizePlainText } from "./sanitize";
import { assertModerationStaff } from "./trust-access";

const PARTY = { id: true, displayName: true, slug: true } as const;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly moderation: ModerationLogService,
    private readonly metrics: MetricsService,
  ) {}

  async create(actor: RequestUser, input: CreateReportInput): Promise<ReportDetailView> {
    await this.assertTarget(actor, input);
    const since = new Date(Date.now() - PLATFORM.reportWindowMinutes * 60_000);
    const recent = await this.prisma.report.count({
      where: { reporterId: actor.id, createdAt: { gte: since } },
    });
    if (recent >= PLATFORM.reportMaxPerWindow) {
      throw new AppError(HttpStatus.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMITED, "Demasiados reportes; espera un momento");
    }
    try {
      const row = await this.prisma.report.create({
        data: {
          reporterId: actor.id,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          description: sanitizePlainText(input.description ?? "", 2000),
        },
        include: { reporter: { select: PARTY } },
      });
      await this.audit.log({
        actorId: actor.id,
        action: "report.created",
        entityType: "Report",
        entityId: row.id,
        metadata: { targetType: input.targetType, targetId: input.targetId, reason: input.reason },
      });
      this.metrics.inc("report_opened_total");
      return this.toDetail(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.REPORT_DUPLICATE, "Ya reportaste este objetivo");
      }
      throw error;
    }
  }

  async listMine(actor: RequestUser, page: number, pageSize: number): Promise<Paginated<ReportListItem>> {
    return this.page({ reporterId: actor.id }, page, pageSize);
  }

  async listAdmin(query: AdminReportsQuery): Promise<Paginated<ReportListItem>> {
    return this.page(
      { status: query.status, reason: query.reason, targetType: query.targetType },
      query.page,
      query.pageSize,
    );
  }

  async getMine(actor: RequestUser, id: string): Promise<ReportDetailView> {
    const row = await this.prisma.report.findUnique({
      where: { id },
      include: { reporter: { select: PARTY } },
    });
    if (!row || row.reporterId !== actor.id) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Reporte no encontrado");
    }
    return this.toDetail(row);
  }

  async getAdmin(actor: RequestUser, id: string): Promise<AdminReportDetailView> {
    assertModerationStaff(actor);
    const row = await this.prisma.report.findUnique({
      where: { id },
      include: { reporter: { select: { ...PARTY, email: true } } },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Reporte no encontrado");
    }
    const priorActions = await this.moderation.forTarget(row.targetType, row.targetId);
    return {
      ...this.toDetail(row),
      reporterEmail: row.reporter.email,
      targetSummary: `${row.targetType} ${row.targetId}`,
      priorActions,
    };
  }

  async assign(actor: RequestUser, id: string): Promise<AdminReportDetailView> {
    assertModerationStaff(actor);
    const row = await this.prisma.report.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Reporte no encontrado");
    }
    if (row.status !== "OPEN" && row.status !== "IN_REVIEW") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "El reporte está cerrado");
    }
    await this.prisma.report.update({
      where: { id },
      data: { assignedAdminId: actor.id, status: "IN_REVIEW" },
    });
    await this.audit.log({
      actorId: actor.id,
      action: "report.assigned",
      entityType: "Report",
      entityId: id,
    });
    return this.getAdmin(actor, id);
  }

  async resolve(actor: RequestUser, id: string, input: AdminReportResolveInput): Promise<AdminReportDetailView> {
    assertModerationStaff(actor);
    const row = await this.prisma.report.findUnique({ where: { id } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Reporte no encontrado");
    }
    if (row.status === "RESOLVED" || row.status === "DISMISSED") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "El reporte está cerrado");
    }
    await this.prisma.report.update({
      where: { id },
      data: { status: input.outcome, resolvedAt: new Date(), assignedAdminId: row.assignedAdminId ?? actor.id },
    });
    await this.moderation.record(actor, {
      targetType: "Report",
      targetId: id,
      actionType: "REPORT_RESOLVED",
      reason: input.note,
      metadata: { outcome: input.outcome },
    });
    return this.getAdmin(actor, id);
  }

  private async assertTarget(actor: RequestUser, input: CreateReportInput): Promise<void> {
    if (input.targetType === "USER") {
      if (input.targetId === actor.id) {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "No puedes reportarte a ti mismo");
      }
      const user = await this.prisma.user.findUnique({ where: { id: input.targetId }, select: { id: true } });
      if (!user) throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Usuario no encontrado");
      return;
    }
    if (input.targetType === "LISTING") {
      const listing = await this.prisma.listing.findUnique({
        where: { id: input.targetId },
        select: { id: true, sellerId: true },
      });
      if (!listing) throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Publicación no encontrada");
      if (listing.sellerId === actor.id) {
        throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "No puedes reportar tu propia publicación");
      }
      return;
    }
    const image = await this.prisma.listingImage.findFirst({
      where: { fileId: input.targetId },
      include: { listing: { select: { sellerId: true } } },
    });
    if (!image) throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Imagen no encontrada");
    if (image.listing.sellerId === actor.id) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "No puedes reportar tu propia imagen");
    }
  }

  private async page(where: Prisma.ReportWhereInput, page: number, pageSize: number) {
    const [rows, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.report.count({ where }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        targetType: row.targetType,
        targetId: row.targetId,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  private toDetail(row: {
    id: string;
    reporterId: string;
    targetType: ReportDetailView["targetType"];
    targetId: string;
    reason: ReportDetailView["reason"];
    description: string;
    status: ReportDetailView["status"];
    assignedAdminId: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
    reporter: { id: string; displayName: string; slug: string };
  }): ReportDetailView {
    return {
      id: row.id,
      targetType: row.targetType,
      targetId: row.targetId,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reporter: row.reporter,
      description: row.description,
      assignedAdminId: row.assignedAdminId,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
    };
  }
}
