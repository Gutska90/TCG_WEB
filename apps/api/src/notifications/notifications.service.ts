import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES, NOTIFICATION_TYPES, isNotificationType, type NotificationType } from "@tcg/config";
import type {
  NotificationListView,
  NotificationPreferenceView,
  NotificationView,
} from "@tcg/types";
import type { PatchNotificationPreferenceInput } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { MailService } from "../mail/mail.service";
import { notificationEmailHtml } from "../mail/mail.templates";
import { PrismaService } from "../prisma/prisma.service";

const TRANSACTIONAL = { inApp: true, email: true, push: false } as const;

const DEFAULTS: Record<NotificationType, { inApp: boolean; email: boolean; push: boolean }> = {
  SALE_MADE: TRANSACTIONAL,
  PURCHASE_MADE: TRANSACTIONAL,
  ORDER_SHIPPED: TRANSACTIONAL,
  ORDER_DELIVERED: TRANSACTIONAL,
  ORDER_CONFIRMED: { inApp: true, email: true, push: false },
  ORDER_CANCELLED: { inApp: true, email: true, push: false },
  ORDER_DISPUTED: { inApp: true, email: true, push: false },
  RATING_RECEIVED: { inApp: true, email: false, push: false },
  WISHLIST_HIT: { inApp: true, email: true, push: false },
  PRICE_DROP: { inApp: false, email: false, push: false },
};

export type NotificationEmitInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  dedupeKey: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async list(userId: string, page: number, pageSize: number): Promise<NotificationListView> {
    const where = { userId, channel: "IN_APP" as const };
    const [total, unreadCount, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map(toView),
      page,
      pageSize,
      total,
      unreadCount,
    };
  }

  async markRead(userId: string, id: string): Promise<NotificationView> {
    const row = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Notificación no encontrada");
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: row.readAt ?? new Date() },
    });
    return toView(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async listPreferences(userId: string): Promise<NotificationPreferenceView[]> {
    await this.ensureDefaults(userId);
    const rows = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const byType = new Map(rows.map((row) => [row.type, row]));
    return NOTIFICATION_TYPES.map((type) => {
      const row = byType.get(type);
      const fallback = DEFAULTS[type];
      return {
        type,
        inApp: row?.inApp ?? fallback.inApp,
        email: row?.email ?? fallback.email,
        push: row?.push ?? fallback.push,
      };
    });
  }

  async patchPreference(userId: string, input: PatchNotificationPreferenceInput): Promise<NotificationPreferenceView> {
    await this.ensureDefaults(userId);
    const fallback = DEFAULTS[input.type];
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type: input.type } },
      update: {
        ...(input.inApp != null ? { inApp: input.inApp } : {}),
        ...(input.email != null ? { email: input.email } : {}),
        ...(input.push != null ? { push: input.push } : {}),
      },
      create: {
        userId,
        type: input.type,
        inApp: input.inApp ?? fallback.inApp,
        email: input.email ?? fallback.email,
        push: input.push ?? fallback.push,
      },
    });
    return { type: input.type, inApp: row.inApp, email: row.email, push: row.push };
  }

  async emit(input: NotificationEmitInput): Promise<boolean> {
    const prefs = await this.preferenceFor(input.userId, input.type);
    const persistInApp = input.type === "WISHLIST_HIT" || prefs.inApp;
    if (persistInApp) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: input.userId,
            type: input.type,
            title: input.title,
            body: input.body,
            data: input.data as Prisma.InputJsonValue,
            channel: "IN_APP",
            dedupeKey: input.dedupeKey,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return false;
        }
        throw error;
      }
    }
    if (prefs.email) {
      const user = await this.prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
      if (user?.email) {
        await this.mail.send({
          to: user.email,
          subject: input.title,
          text: input.body,
          html: notificationEmailHtml(input.title, input.body),
        });
      }
    }
    return persistInApp;
  }

  /** After money/order commits. Email/in-app failure must not fail the mutation. */
  async safeEmit(input: NotificationEmitInput): Promise<void> {
    try {
      await this.emit(input);
    } catch (error) {
      this.logger.error(
        error instanceof Error ? error.message : "notification emit failed",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async preferenceFor(userId: string, type: NotificationType) {
    const row = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    return row ?? DEFAULTS[type];
  }

  private async ensureDefaults(userId: string): Promise<void> {
    await this.prisma.notificationPreference.createMany({
      data: NOTIFICATION_TYPES.map((type) => ({
        userId,
        type,
        ...DEFAULTS[type],
      })),
      skipDuplicates: true,
    });
  }
}

function toView(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
}): NotificationView {
  const data =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    type: isNotificationType(row.type) ? row.type : "WISHLIST_HIT",
    title: row.title,
    body: row.body,
    data,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
