import { HttpStatus, Injectable } from "@nestjs/common";
import { ERROR_CODES, PLATFORM, formatClp } from "@tcg/config";
import type { Paginated, WishlistItemView } from "@tcg/types";
import type { UpsertWishlistItemInput } from "@tcg/validation";
import { AppError } from "../common/errors/app-error";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { addUtcDays, utcDateOnly } from "../prices/price-index";
import { shouldNotifyPriceDrop, shouldNotifyWishlistHit } from "./wishlist-rules";

const include = {
  variant: { include: { card: { include: { set: { include: { game: true } } } } } },
} as const;

type Row = {
  id: string;
  variantId: string;
  targetPriceClp: number;
  notifyBelow: boolean;
  createdAt: Date;
  variant: {
    id: string;
    language: WishlistItemView["variant"]["language"];
    finish: WishlistItemView["variant"]["finish"];
    finishDetail: string;
    isDefault: boolean;
    card: {
      id: string;
      slug: string;
      name: string;
      number: string;
      rarity: string;
      imageUrl: string | null;
      set: { slug: string; game: { slug: string } };
    };
  };
};

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string, page: number, pageSize: number): Promise<Paginated<WishlistItemView>> {
    this.flags.assertWishlistAllowed();
    const where = { userId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.wishlistItem.count({ where }),
      this.prisma.wishlistItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include,
      }),
    ]);
    const mins = await this.minListings(rows.map((row) => row.variantId));
    return {
      items: rows.map((row) => toView(row, mins.get(row.variantId) ?? null)),
      page,
      pageSize,
      total,
    };
  }

  async upsert(userId: string, variantId: string, input: UpsertWishlistItemInput): Promise<WishlistItemView> {
    this.flags.assertWishlistAllowed();
    assertUuid(variantId);
    const variant = await this.prisma.cardVariant.findUnique({
      where: { id: variantId },
      include: { card: { include: { set: { include: { game: true } } } } },
    });
    if (!variant) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    const row = await this.prisma.wishlistItem.upsert({
      where: { userId_variantId: { userId, variantId } },
      update: {
        targetPriceClp: input.targetPriceClp,
        ...(input.notifyBelow != null ? { notifyBelow: input.notifyBelow } : {}),
      },
      create: {
        userId,
        variantId,
        targetPriceClp: input.targetPriceClp,
        notifyBelow: input.notifyBelow ?? true,
      },
      include,
    });
    const mins = await this.minListings([variantId]);
    return toView(row, mins.get(variantId) ?? null);
  }

  async remove(userId: string, variantId: string): Promise<void> {
    this.flags.assertWishlistAllowed();
    assertUuid(variantId);
    const row = await this.prisma.wishlistItem.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Ítem de wishlist no encontrado");
    }
    await this.prisma.wishlistItem.delete({ where: { id: row.id } });
  }

  async scanAll(): Promise<{ variants: number; hits: number; drops: number }> {
    if (!this.flags.current().enableWishlist) {
      return { variants: 0, hits: 0, drops: 0 };
    }
    const variantIds = [
      ...new Set(
        (
          await this.prisma.wishlistItem.findMany({
            where: { notifyBelow: true },
            select: { variantId: true },
            distinct: ["variantId"],
            take: 5_000,
          })
        ).map((row) => row.variantId),
      ),
    ];
    let hits = 0;
    let drops = 0;
    for (const variantId of variantIds) {
      const result = await this.checkVariant(variantId);
      hits += result.hits;
      drops += result.drops;
    }
    return { variants: variantIds.length, hits, drops };
  }

  async checkVariant(variantId: string): Promise<{ hits: number; drops: number }> {
    if (!this.flags.current().enableWishlist) return { hits: 0, drops: 0 };
    const min = await this.minListing(variantId);
    if (!min) return { hits: 0, drops: 0 };
    const items = await this.prisma.wishlistItem.findMany({
      where: { variantId, notifyBelow: true },
      include: { variant: { include: { card: true } } },
    });
    let hits = 0;
    for (const item of items) {
      if (
        !shouldNotifyWishlistHit({
          minPriceClp: min.priceClp,
          targetPriceClp: item.targetPriceClp,
          listingId: min.id,
          lastListingId: item.lastNotifiedListingId,
          lastPriceClp: item.lastNotifiedPriceClp,
        })
      ) {
        continue;
      }
      const cardName = item.variant.card.name;
      const emitted = await this.notifications.emit({
        userId: item.userId,
        type: "WISHLIST_HIT",
        title: `${cardName} apareció por ${formatClp(min.priceClp)}`,
        body: `${cardName} apareció por ${formatClp(min.priceClp)}.`,
        data: { variantId, listingId: min.id, priceClp: min.priceClp },
        dedupeKey: `WISHLIST_HIT:${min.id}:${min.priceClp}`,
      });
      if (emitted) {
        await this.prisma.wishlistItem.update({
          where: { id: item.id },
          data: { lastNotifiedListingId: min.id, lastNotifiedPriceClp: min.priceClp },
        });
        hits += 1;
      }
    }

    const min7d = await this.listingMin7d(variantId);
    let drops = 0;
    if (shouldNotifyPriceDrop({ currentMin: min.priceClp, min7d, thresholdBps: PLATFORM.priceDropMinBps })) {
      const watchers = await this.priceDropWatchers(variantId);
      const card = items[0]?.variant.card ?? (await this.prisma.cardVariant.findUnique({
        where: { id: variantId },
        include: { card: true },
      }))?.card;
      const name = card?.name ?? "Carta";
      for (const userId of watchers) {
        const emitted = await this.notifications.emit({
          userId,
          type: "PRICE_DROP",
          title: `${name} bajó a ${formatClp(min.priceClp)}`,
          body: `El menor listing de ${name} bajó a ${formatClp(min.priceClp)}.`,
          data: { variantId, listingId: min.id, priceClp: min.priceClp },
          dedupeKey: `PRICE_DROP:${variantId}:${min.id}:${min.priceClp}`,
        });
        if (emitted) drops += 1;
      }
    }
    return { hits, drops };
  }

  private async minListing(variantId: string): Promise<{ id: string; priceClp: number } | null> {
    const row = await this.prisma.listing.findFirst({
      where: { variantId, status: "ACTIVE", quantity: { gt: 0 } },
      orderBy: { priceClp: "asc" },
      select: { id: true, priceClp: true, quantity: true, quantityReserved: true },
    });
    if (!row || row.quantity - row.quantityReserved <= 0) return null;
    return { id: row.id, priceClp: row.priceClp };
  }

  private async minListings(variantIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (variantIds.length === 0) return out;
    const rows = await this.prisma.listing.findMany({
      where: { variantId: { in: variantIds }, status: "ACTIVE", quantity: { gt: 0 } },
      select: { variantId: true, priceClp: true, quantity: true, quantityReserved: true },
    });
    for (const row of rows) {
      if (!row.variantId || row.quantity - row.quantityReserved <= 0) continue;
      const current = out.get(row.variantId);
      if (current == null || row.priceClp < current) out.set(row.variantId, row.priceClp);
    }
    return out;
  }

  private async listingMin7d(variantId: string): Promise<number | null> {
    const from = addUtcDays(utcDateOnly(), -7);
    const row = await this.prisma.cardPrice.findFirst({
      where: { variantId, source: "LISTING_MIN", capturedOn: { lte: from } },
      orderBy: { capturedOn: "desc" },
      select: { priceClp: true },
    });
    return row?.priceClp ?? null;
  }

  private async priceDropWatchers(variantId: string): Promise<string[]> {
    const [wish, favs] = await Promise.all([
      this.prisma.wishlistItem.findMany({ where: { variantId }, select: { userId: true } }),
      this.prisma.favorite.findMany({ where: { variantId }, select: { userId: true } }),
    ]);
    return [...new Set([...wish, ...favs].map((row) => row.userId))];
  }
}

function toView(row: Row, currentMinClp: number | null): WishlistItemView {
  return {
    id: row.id,
    variantId: row.variantId,
    targetPriceClp: row.targetPriceClp,
    notifyBelow: row.notifyBelow,
    currentMinClp,
    hit: currentMinClp != null && currentMinClp <= row.targetPriceClp,
    createdAt: row.createdAt.toISOString(),
    variant: {
      id: row.variant.id,
      language: row.variant.language,
      finish: row.variant.finish,
      finishDetail: row.variant.finishDetail,
      isDefault: row.variant.isDefault,
    },
    card: {
      id: row.variant.card.id,
      slug: row.variant.card.slug,
      name: row.variant.card.name,
      number: row.variant.card.number,
      rarity: row.variant.card.rarity,
      imageUrl: row.variant.card.imageUrl,
      gameSlug: row.variant.card.set.game.slug,
      setSlug: row.variant.card.set.slug,
    },
  };
}

function assertUuid(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "No encontrado");
  }
}
