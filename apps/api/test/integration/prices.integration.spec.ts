import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";
import { MarketService } from "../../src/listings/market.service";
import { PricesService } from "../../src/prices/prices.service";
import { CollectionsService } from "../../src/collections/collections.service";
import { AuditService } from "../../src/audit/audit.service";
import { flagsForTest } from "../../src/flags/feature-flags.service";
import { addUtcDays, utcDateOnly } from "../../src/prices/price-index";
import { cleanupSale, cleanupUsersAndCatalog, createOpenListing, createPendingSale } from "./helpers/market-fixture";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("Fase 13 prices (postgres)", () => {
  const prisma = new PrismaService();
  const flags = flagsForTest({ enablePrices: true, enableCollections: true });
  const market = new MarketService(prisma);
  const prices = new PricesService(prisma, market, flags);
  const collections = new CollectionsService(prisma, flags, new AuditService(prisma));

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("upserts one LISTING_MIN and LISTING_AVG per day", async () => {
    const listing = await createOpenListing(prisma);
    try {
      await market.snapshotVariant(prisma, listing.variantId);
      await market.snapshotVariant(prisma, listing.variantId);
      const rows = await prisma.cardPrice.findMany({ where: { variantId: listing.variantId } });
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.source).sort()).toEqual(["LISTING_AVG", "LISTING_MIN"]);
      expect(rows.every((row) => row.priceClp === 80_000)).toBe(true);
    } finally {
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listing.sellerId],
        listingId: listing.listingId,
        variantId: listing.variantId,
        gameId: listing.gameId,
      });
    }
  });

  it("captures SALE from COMPLETED orders and serves history + TCG Market Price", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await prisma.order.update({
        where: { id: sale.orderId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      const captured = await prices.captureDay();
      expect(captured.sales).toBeGreaterThanOrEqual(1);
      const history = await prices.history(sale.variantId, "3m");
      expect(history.currency).toBe("CLP");
      expect(history.lastSaleClp).toBe(80_000);
      expect(history.median30dClp).toBe(80_000);
      expect(history.volumeSold).toBe(1);
      expect(history.confidence).toBe("LOW");
      expect(history.current).toBe(80_000);
      expect(history.points.some((point) => point.sale === 80_000)).toBe(true);
      expect(history.disclaimer).toContain("TCG Market Chile");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("imputes SALE on completedAt, not orderItem.createdAt", async () => {
    const sale = await createPendingSale(prisma);
    try {
      const old = addUtcDays(utcDateOnly(), -3);
      await prisma.order.update({
        where: { id: sale.orderId },
        data: { status: "COMPLETED", completedAt: new Date(), createdAt: old },
      });
      await prisma.orderItem.updateMany({
        where: { orderId: sale.orderId },
        data: { createdAt: old },
      });
      const captured = await prices.captureDay();
      expect(captured.sales).toBeGreaterThanOrEqual(1);
      const today = utcDateOnly();
      const salePoint = await prisma.cardPrice.findUnique({
        where: {
          variantId_source_capturedOn: { variantId: sale.variantId, source: "SALE", capturedOn: today },
        },
      });
      expect(salePoint?.priceClp).toBe(80_000);
      const oldPoint = await prisma.cardPrice.findUnique({
        where: {
          variantId_source_capturedOn: { variantId: sale.variantId, source: "SALE", capturedOn: old },
        },
      });
      expect(oldPoint).toBeNull();
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("records collection value snapshots and 30-day change", async () => {
    const listing = await createOpenListing(prisma);
    const buyer = await prisma.user.create({
      data: {
        email: `px-buyer-${listing.variantId.slice(0, 8)}@test.local`,
        displayName: "Px Buyer",
        slug: `px-buyer-${listing.variantId.slice(0, 8)}`,
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "USER" }] },
        profile: { create: { country: "CL" } },
      },
    });
    try {
      await collections.addItem(buyer.id, {
        variantId: listing.variantId,
        condition: "NM",
        quantity: 1,
        purchasePriceClp: 50_000,
      });
      const today = await collections.captureDailyValues();
      expect(today.collections).toBeGreaterThanOrEqual(1);
      const collection = await prisma.collection.findUniqueOrThrow({ where: { userId: buyer.id } });
      await prisma.collectionValueSnapshot.create({
        data: {
          collectionId: collection.id,
          capturedOn: addUtcDays(utcDateOnly(), -30),
          valueClp: 10_000,
          breakdown: { estimatedValueClp: 10_000 },
        },
      });
      const summary = await collections.summary(buyer.id);
      expect(summary.estimatedValueClp).toBe(80_000);
      expect(summary.change30dClp).toBe(70_000);
    } finally {
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listing.sellerId, buyer.id],
        listingId: listing.listingId,
        variantId: listing.variantId,
        gameId: listing.gameId,
      });
    }
  });
});
