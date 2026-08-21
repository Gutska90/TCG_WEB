import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { suggestListingPrice } from "@tcg/config";
import type { CardDetailView, PriceSuggestionView } from "@tcg/types";
import { PrismaService } from "../prisma/prisma.service";

export type MarketSummary = CardDetailView["market"];

const emptyMarket: MarketSummary = {
  currency: "CLP",
  marketPrice: null,
  minListing: null,
  avgListing: null,
  activeListings: 0,
};

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async summarizeForVariant(variantId: string): Promise<MarketSummary> {
    return this.summarize({ variantId });
  }

  async summarizeForCard(cardId: string): Promise<MarketSummary> {
    return this.summarize({ variant: { cardId } });
  }

  async suggestionForVariant(variantId: string): Promise<PriceSuggestionView> {
    const market = await this.summarizeForVariant(variantId);
    return {
      currency: "CLP",
      market: market.marketPrice,
      minListing: market.minListing,
      avgListing: market.avgListing,
      activeListings: market.activeListings,
      suggested: suggestListingPrice({
        market: market.marketPrice,
        minListing: market.minListing,
        activeListings: market.activeListings,
      }),
    };
  }

  async snapshotVariant(tx: Prisma.TransactionClient, variantId: string): Promise<void> {
    const market = await this.summarize({ variantId }, tx);
    if (market.minListing == null || market.avgListing == null) {
      return;
    }
    await tx.cardPrice.createMany({
      data: [
        { variantId, source: "LISTING_MIN", priceClp: market.minListing },
        { variantId, source: "LISTING_AVG", priceClp: market.avgListing },
      ],
    });
  }

  private async summarize(
    where: Prisma.ListingWhereInput,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<MarketSummary> {
    const rows = await client.listing.findMany({
      where: { ...where, status: "ACTIVE", quantity: { gt: 0 } },
      select: { priceClp: true, quantity: true, quantityReserved: true },
    });
    const active = rows
      .map((row) => ({
        priceClp: row.priceClp,
        available: row.quantity - row.quantityReserved,
      }))
      .filter((row) => row.available > 0);
    if (active.length === 0) {
      return emptyMarket;
    }
    const minListing = Math.min(...active.map((row) => row.priceClp));
    const weight = active.reduce((sum, row) => sum + row.available, 0);
    const avgListing = Math.round(
      active.reduce((sum, row) => sum + row.priceClp * row.available, 0) / weight,
    );
    return {
      currency: "CLP",
      marketPrice: avgListing,
      minListing,
      avgListing,
      activeListings: active.length,
    };
  }
}
