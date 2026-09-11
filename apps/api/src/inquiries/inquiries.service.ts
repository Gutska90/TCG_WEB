import { HttpStatus, Injectable } from "@nestjs/common";
import {
  CARD_CONDITION_LABELS,
  ERROR_CODES,
  PLATFORM,
  cartSellerWhatsappMessage,
  formatClp,
  inquiryNumberLabel,
} from "@tcg/config";
import type { Paginated, SellerInquiryView } from "@tcg/types";
import type { CreateInquiryInput, ListInquiriesQuery } from "@tcg/validation";
import { AuditService } from "../audit/audit.service";
import type { CartActor } from "../cart/cart.service";
import { CartService } from "../cart/cart.service";
import { AppError } from "../common/errors/app-error";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { inquiryInclude, toInquiryView } from "./inquiry.mapper";

export type InquiryCreateResult = {
  view: SellerInquiryView;
  issuedGuestToken?: string;
  clearGuestCookie?: boolean;
};

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(actor: CartActor, input: CreateInquiryInput): Promise<InquiryCreateResult> {
    const cart = await this.carts.get(actor);
    const group = cart.view.groups.find((row) => row.seller.id === input.sellerId);
    const lines = group?.items.filter((item) => item.purchasable) ?? [];
    if (!group || lines.length === 0) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CART_EMPTY, "No hay cartas consultables de este vendedor");
    }

    const guestToken = actor.userId ? null : (cart.issuedGuestToken ?? actor.guestToken ?? null);
    if (!actor.userId && !guestToken) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "No se pudo identificar el carrito");
    }

    const buyerName = actor.userId
      ? ((await this.prisma.user.findUnique({ where: { id: actor.userId }, select: { displayName: true } }))
          ?.displayName ?? null)
      : null;

    const expiresAt = new Date(Date.now() + PLATFORM.inquiryTtlHours * 60 * 60_000);
    const created = await this.prisma.$transaction(async (tx) => {
      const [seq] = await tx.$queryRaw<Array<{ n: bigint | number }>>`
        SELECT nextval('seller_inquiry_numbers') AS n
      `;
      if (seq?.n == null) {
        throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL, "No se pudo numerar la consulta");
      }
      const inquiryNumber = `C-${seq.n.toString()}`;
      const messageText = cartSellerWhatsappMessage({
        sellerName: group.seller.displayName,
        buyerName,
        lines: lines.map((item) => ({
          cardName: item.listing.variant.card.name,
          setName: item.listing.variant.card.setName,
          conditionLabel: CARD_CONDITION_LABELS[item.listing.condition],
          quantity: item.quantity,
          lineTotalLabel: formatClp(item.lineTotalClp),
        })),
        subtotalLabel: formatClp(group.subtotalClp),
        cartUrl: input.cartUrl ?? null,
        inquiryNumber,
      });
      const row = await tx.sellerInquiry.create({
        data: {
          inquiryNumber,
          buyerId: actor.userId ?? null,
          guestToken,
          sellerId: input.sellerId,
          subtotalClp: group.subtotalClp,
          messageText,
          expiresAt,
          items: {
            create: lines.map((item) => ({
              listingId: item.listingId,
              variantId: item.listing.variant.id,
              titleSnapshot: item.listing.title,
              condition: item.listing.condition,
              quantity: item.quantity,
              unitPriceClp: item.listing.priceClp,
              lineTotalClp: item.lineTotalClp,
            })),
          },
        },
        include: inquiryInclude,
      });
      await this.audit.log(
        {
          actorId: actor.userId ?? null,
          action: "inquiry.created",
          entityType: "SellerInquiry",
          entityId: row.id,
          metadata: { inquiryNumber, sellerId: input.sellerId, subtotalClp: group.subtotalClp },
        },
        tx,
      );
      return row;
    });

    const view = toInquiryView(created);
    await this.notifications.safeEmit({
      userId: input.sellerId,
      type: "SELLER_INQUIRY",
      title: `Nueva ${inquiryNumberLabel(view.inquiryNumber)}`,
      body: `${inquiryNumberLabel(view.inquiryNumber)} por ${formatClp(view.subtotalClp)}. No reserva stock.`,
      data: { inquiryId: view.id, inquiryNumber: view.inquiryNumber },
      dedupeKey: `SELLER_INQUIRY:${view.id}`,
    });

    return {
      view,
      issuedGuestToken: cart.issuedGuestToken,
      clearGuestCookie: cart.clearGuestCookie,
    };
  }

  async list(userId: string, query: ListInquiriesQuery): Promise<Paginated<SellerInquiryView>> {
    const where = query.as === "seller" ? { sellerId: userId } : { buyerId: userId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.sellerInquiry.count({ where }),
      this.prisma.sellerInquiry.findMany({
        where,
        include: inquiryInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map(toInquiryView),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(actor: CartActor, id: string): Promise<SellerInquiryView> {
    const access = this.accessWhere(actor);
    if (!access) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Consulta no encontrada");
    }
    const row = await this.prisma.sellerInquiry.findFirst({
      where: { id, OR: access },
      include: inquiryInclude,
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Consulta no encontrada");
    }
    return toInquiryView(row);
  }

  async expireOpen(): Promise<{ expired: number }> {
    const result = await this.prisma.sellerInquiry.updateMany({
      where: { status: "OPEN", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED" },
    });
    return { expired: result.count };
  }

  private accessWhere(actor: CartActor): Array<{ buyerId?: string; sellerId?: string; guestToken?: string }> | null {
    const clauses: Array<{ buyerId?: string; sellerId?: string; guestToken?: string }> = [];
    if (actor.userId) {
      clauses.push({ buyerId: actor.userId }, { sellerId: actor.userId });
    }
    if (actor.guestToken) {
      clauses.push({ guestToken: actor.guestToken });
    }
    return clauses.length > 0 ? clauses : null;
  }
}
