import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ERROR_CODES,
  PRICE_RANGE_DAYS,
  type PriceRange,
} from "@tcg/config";
import type { PriceHistoryView, PriceSuggestionView } from "@tcg/types";
import { AppError } from "../common/errors/app-error";
import { mapPool } from "../common/async-pool";
import { chileCalendarDayRange, startOfChileDayForDate } from "../common/chile-time";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { MarketService } from "../listings/market.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  addUtcDays,
  meanInt,
  medianInt,
  saleConfidence,
  tcgMarketPrice,
  utcDateOnly,
} from "./price-index";

const SALE_LOOKBACK_DAYS = 30;
const LISTING_AVG_LOOKBACK_DAYS = 7;
const CAPTURE_CONCURRENCY = 8;
const VARIANT_PAGE = 500;

@Injectable()
export class PricesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async captureDay(now = new Date()): Promise<{ listings: number; sales: number }> {
    const { day, from, to } = chileCalendarDayRange(now);
    let listings = 0;
    for await (const page of this.activeVariantIdPages()) {
      await mapPool(page, CAPTURE_CONCURRENCY, (variantId) => this.market.snapshotVariant(this.prisma, variantId, day));
      listings += page.length;
    }
    const sold = await this.prisma.orderItem.findMany({
      where: {
        order: { status: "COMPLETED", completedAt: { gte: from, lt: to } },
      },
      select: { variantId: true, unitPriceClp: true },
    });
    const byVariant = new Map<string, number[]>();
    for (const row of sold) {
      const list = byVariant.get(row.variantId) ?? [];
      list.push(row.unitPriceClp);
      byVariant.set(row.variantId, list);
    }
    let sales = 0;
    for (const [variantId, prices] of byVariant) {
      const median = medianInt(prices);
      if (median == null) continue;
      await this.upsertPrice(this.prisma, variantId, "SALE", median, day);
      sales += 1;
    }
    return { listings, sales };
  }

  async history(variantId: string, range: PriceRange): Promise<PriceHistoryView> {
    this.flags.assertPricesAllowed();
    await this.requireVariant(variantId);
    const now = new Date();
    const days = PRICE_RANGE_DAYS[range];
    const from = addUtcDays(utcDateOnly(now), -days);
    const [rows, live, sales30] = await Promise.all([
      this.prisma.cardPrice.findMany({
        where: { variantId, capturedOn: { gte: from } },
        orderBy: { capturedOn: "asc" },
      }),
      this.market.summarizeForVariant(variantId),
      this.completedSales(variantId, startOfChileDayForDate(addUtcDays(utcDateOnly(now), -SALE_LOOKBACK_DAYS))),
    ]);
    const byDay = new Map<string, { min?: number; avg?: number; sale?: number }>();
    for (const row of rows) {
      const key = row.capturedOn.toISOString().slice(0, 10);
      const point = byDay.get(key) ?? {};
      if (row.source === "LISTING_MIN") point.min = row.priceClp;
      if (row.source === "LISTING_AVG") point.avg = row.priceClp;
      if (row.source === "SALE") point.sale = row.priceClp;
      byDay.set(key, point);
    }
    const points = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([t, point]) => ({
        t,
        min: point.min ?? null,
        avg: point.avg ?? null,
        sale: point.sale ?? null,
      }));
    const listingAvg7 = await this.recentListingAvg(variantId, LISTING_AVG_LOOKBACK_DAYS);
    const salePrices = sales30.map((row) => row.unitPriceClp);
    const current = tcgMarketPrice({
      salePrices30d: salePrices,
      listingAvgClp: listingAvg7 ?? live.avgListing,
    });
    const seriesMins = points.map((p) => p.min).filter((v): v is number => v != null);
    const seriesAvgs = points.map((p) => p.avg).filter((v): v is number => v != null);
    const seriesSales = points.map((p) => p.sale).filter((v): v is number => v != null);
    const lastSale = sales30.at(-1)?.unitPriceClp ?? null;
    const volumeSold = sales30.reduce((sum, row) => sum + row.quantity, 0);
    return {
      currency: "CLP",
      range,
      current,
      min: seriesMins.length ? Math.min(...seriesMins) : live.minListing,
      avg: meanInt(seriesAvgs) ?? live.avgListing,
      max: seriesMins.length || seriesAvgs.length || seriesSales.length
        ? Math.max(...seriesMins, ...seriesAvgs, ...seriesSales)
        : live.minListing,
      volumeSold,
      lastSaleClp: lastSale,
      avg30dClp: meanInt(salePrices),
      median30dClp: medianInt(salePrices),
      minListingClp: live.minListing,
      confidence: saleConfidence(sales30.length),
      points,
      disclaimer:
        "Índice interno TCG Market Chile a partir de ventas COMPLETED y publicaciones activas. No es precio de TCGPlayer, Cardmarket ni TCGMatch.",
    };
  }

  async suggestionForVariant(variantId: string): Promise<PriceSuggestionView> {
    const live = await this.market.suggestionForVariant(variantId);
    if (!this.flags.current().enablePrices) return live;
    const listingAvg7 = await this.recentListingAvg(variantId, LISTING_AVG_LOOKBACK_DAYS);
    if (listingAvg7 == null) return live;
    return this.market.suggestionFromMarket({
      currency: "CLP",
      marketPrice: listingAvg7,
      minListing: live.minListing,
      avgListing: listingAvg7,
      activeListings: live.activeListings,
    });
  }

  private async recentListingAvg(variantId: string, days: number): Promise<number | null> {
    const from = addUtcDays(utcDateOnly(), -days);
    const rows = await this.prisma.cardPrice.findMany({
      where: { variantId, source: "LISTING_AVG", capturedOn: { gte: from } },
      select: { priceClp: true },
    });
    return meanInt(rows.map((row) => row.priceClp));
  }

  private async completedSales(variantId: string, from: Date) {
    return this.prisma.orderItem.findMany({
      where: { variantId, order: { status: "COMPLETED", completedAt: { gte: from } } },
      select: { unitPriceClp: true, quantity: true, createdAt: true },
      orderBy: { order: { completedAt: "asc" } },
    });
  }

  private async *activeVariantIdPages(): AsyncGenerator<string[]> {
    let offset = 0;
    for (;;) {
      const rows = await this.prisma.$queryRaw<Array<{ variant_id: string }>>(Prisma.sql`
        SELECT variant_id
        FROM listings
        WHERE status = 'ACTIVE'::"ListingStatus"
          AND quantity > 0
          AND variant_id IS NOT NULL
        GROUP BY variant_id
        ORDER BY variant_id
        LIMIT ${VARIANT_PAGE} OFFSET ${offset}
      `);
      if (rows.length === 0) return;
      yield rows.map((row) => row.variant_id);
      offset += rows.length;
      if (rows.length < VARIANT_PAGE) return;
    }
  }

  private async requireVariant(variantId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(variantId)) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
    const row = await this.prisma.cardVariant.findUnique({ where: { id: variantId } });
    if (!row) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Variante no encontrada");
    }
  }

  private async upsertPrice(
    client: Prisma.TransactionClient | PrismaService,
    variantId: string,
    source: "LISTING_MIN" | "LISTING_AVG" | "SALE",
    priceClp: number,
    capturedOn: Date,
  ): Promise<void> {
    await client.cardPrice.upsert({
      where: {
        variantId_source_capturedOn: { variantId, source, capturedOn },
      },
      update: { priceClp, capturedAt: new Date() },
      create: { variantId, source, priceClp, capturedOn, capturedAt: new Date() },
    });
  }
}

export { SALE_LOOKBACK_DAYS };
