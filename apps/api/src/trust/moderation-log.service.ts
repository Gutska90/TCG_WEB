import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { ModerationActionType } from "@tcg/config";
import type { ModerationActionView, Paginated } from "@tcg/types";
import { AuditService } from "../audit/audit.service";
import type { RequestUser } from "../auth/request-user";
import { PrismaService } from "../prisma/prisma.service";
import { asJsonRecord } from "./sanitize";

@Injectable()
export class ModerationLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async record(
    actor: RequestUser,
    input: {
      targetType: string;
      targetId: string;
      actionType: ModerationActionType;
      reason: string;
      metadata?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await this.prisma.moderationAction.create({
      data: {
        actorAdminId: actor.id,
        targetType: input.targetType,
        targetId: input.targetId,
        actionType: input.actionType,
        reason: input.reason,
        metadata: input.metadata ?? {},
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: `moderation.${input.actionType.toLowerCase()}`,
      entityType: input.targetType,
      entityId: input.targetId,
      metadata: { reason: input.reason, actionType: input.actionType },
    });
  }

  async list(page: number, pageSize: number): Promise<Paginated<ModerationActionView>> {
    const [rows, total] = await Promise.all([
      this.prisma.moderationAction.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.moderationAction.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        actorAdminId: row.actorAdminId,
        targetType: row.targetType,
        targetId: row.targetId,
        actionType: row.actionType,
        reason: row.reason,
        metadata: asJsonRecord(row.metadata),
        createdAt: row.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async forTarget(targetType: string, targetId: string): Promise<ModerationActionView[]> {
    const rows = await this.prisma.moderationAction.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return rows.map((row) => ({
      id: row.id,
      actorAdminId: row.actorAdminId,
      targetType: row.targetType,
      targetId: row.targetId,
      actionType: row.actionType,
      reason: row.reason,
      metadata: asJsonRecord(row.metadata),
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
