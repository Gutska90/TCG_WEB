import { HttpStatus, Injectable } from "@nestjs/common";
import type { FeedbackCategory } from "@prisma/client";
import { ERROR_CODES, PLATFORM } from "@tcg/config";
import type { FeedbackView } from "@tcg/types";
import type { CreateFeedbackInput } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/request-user";

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateFeedbackInput,
    ctx: { user?: RequestUser; ip?: string },
  ): Promise<FeedbackView> {
    const windowStart = new Date(Date.now() - PLATFORM.feedbackWindowMinutes * 60_000);
    const recent = await this.prisma.feedback.count({
      where: {
        createdAt: { gte: windowStart },
        ...(ctx.user ? { userId: ctx.user.id } : { ip: ctx.ip ?? "unknown" }),
      },
    });
    if (recent >= PLATFORM.feedbackMaxPerWindow) {
      throw new AppError(
        HttpStatus.TOO_MANY_REQUESTS,
        ERROR_CODES.RATE_LIMITED,
        "Demasiados mensajes de feedback. Intenta más tarde.",
      );
    }

    const row = await this.prisma.feedback.create({
      data: {
        userId: ctx.user?.id ?? null,
        ip: ctx.ip ?? null,
        category: input.category as FeedbackCategory,
        message: input.message.trim(),
        screen: input.screen?.trim() || null,
        appVersion: input.appVersion?.trim() || null,
        requestId: input.requestId?.trim() || null,
      },
    });
    return toFeedbackView(row);
  }

  async list(page: number, pageSize: number): Promise<{
    items: FeedbackView[];
    page: number;
    pageSize: number;
    total: number;
  }> {
    const [rows, total] = await Promise.all([
      this.prisma.feedback.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.feedback.count(),
    ]);
    return {
      items: rows.map(toFeedbackView),
      page,
      pageSize,
      total,
    };
  }
}

function toFeedbackView(row: {
  id: string;
  userId: string | null;
  category: FeedbackCategory;
  message: string;
  screen: string | null;
  appVersion: string | null;
  requestId: string | null;
  createdAt: Date;
}): FeedbackView {
  return {
    id: row.id,
    userId: row.userId,
    category: row.category,
    message: row.message,
    screen: row.screen,
    appVersion: row.appVersion,
    requestId: row.requestId,
    createdAt: row.createdAt.toISOString(),
  };
}
