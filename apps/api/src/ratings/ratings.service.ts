import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import type { ReputationView, SellerRatingView, SellerRatingsPageView } from "@tcg/types";
import type { CreateRatingInput, PaginationQuery } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { RequestUser } from "../auth/request-user";
import {
  EMPTY_REPUTATION,
  ratingInclude,
  roundStars,
  toSellerRatingView,
} from "./rating.mapper";

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async summarizeForUsers(userIds: string[]): Promise<Map<string, ReputationView>> {
    const unique = [...new Set(userIds)];
    const result = new Map(unique.map((id) => [id, EMPTY_REPUTATION]));
    if (unique.length === 0) {
      return result;
    }
    const groups = await this.prisma.sellerRating.groupBy({
      by: ["toUserId"],
      where: { toUserId: { in: unique }, isPublic: true },
      _avg: { stars: true },
      _count: { _all: true },
    });
    for (const group of groups) {
      result.set(group.toUserId, {
        averageStars: roundStars(group._avg.stars),
        count: group._count._all,
      });
    }
    return result;
  }

  async summarizeOne(userId: string): Promise<ReputationView> {
    const map = await this.summarizeForUsers([userId]);
    return map.get(userId) ?? EMPTY_REPUTATION;
  }

  async listPublic(idOrSlug: string, query: PaginationQuery): Promise<SellerRatingsPageView> {
    const user = await this.findPublicUser(idOrSlug);
    const where = { toUserId: user.id, isPublic: true };
    const [total, rows, summary] = await Promise.all([
      this.prisma.sellerRating.count({ where }),
      this.prisma.sellerRating.findMany({
        where,
        include: ratingInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.summarizeOne(user.id),
    ]);
    return {
      items: rows.map(toSellerRatingView),
      page: query.page,
      pageSize: query.pageSize,
      total,
      summary,
    };
  }

  async rate(actor: RequestUser, orderId: string, input: CreateRatingInput): Promise<SellerRatingView> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { rating: true },
    });
    if (!order || order.buyerId !== actor.id) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Orden no encontrada");
    }
    if (order.status !== "COMPLETED") {
      throw new AppError(
        HttpStatus.CONFLICT,
        ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
        "Solo puedes valorar una compra completada",
      );
    }
    if (order.rating) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, "Esta orden ya tiene una valoración");
    }
    const row = await this.prisma.sellerRating.create({
      data: {
        orderId: order.id,
        fromUserId: actor.id,
        toUserId: order.sellerId,
        stars: input.stars,
        comment: input.comment ?? "",
        isPublic: input.isPublic ?? true,
      },
      include: ratingInclude,
    });
    await this.audit.log({
      actorId: actor.id,
      action: "rating.created",
      entityType: "SellerRating",
      entityId: row.id,
      metadata: { orderId: order.id, stars: input.stars },
    });
    await this.notifications.safeEmit({
      userId: order.sellerId,
      type: "RATING_RECEIVED",
      title: "Nueva valoración",
      body: `${row.from.displayName} te valoró con ${input.stars} estrellas.`,
      data: { orderId: order.id, stars: input.stars },
      dedupeKey: `RATING_RECEIVED:${order.id}`,
    });
    return toSellerRatingView(row);
  }

  private async findPublicUser(idOrSlug: string) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const user = await this.prisma.user.findFirst({
      where: uuid
        ? { deletedAt: null, isBanned: false, OR: [{ id: idOrSlug }, { slug: idOrSlug }] }
        : { deletedAt: null, isBanned: false, slug: idOrSlug },
      select: { id: true },
    });
    if (!user) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Usuario no encontrado");
    }
    return user;
  }
}
