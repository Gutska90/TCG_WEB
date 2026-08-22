import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { PrismaService } from "../../src/prisma/prisma.service";
import { WishlistService } from "../../src/wishlist/wishlist.service";
import { NotificationsService } from "../../src/notifications/notifications.service";
import { flagsForTest } from "../../src/flags/feature-flags.service";
import { addUtcDays, utcDateOnly } from "../../src/prices/price-index";
import { cleanupUsersAndCatalog, createBuyer, createOpenListing } from "./helpers/market-fixture";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("Fase 14 wishlist (postgres)", () => {
  const prisma = new PrismaService();
  const flags = flagsForTest({ enableWishlist: true });
  const notifications = new NotificationsService(prisma, { send: async () => undefined } as never);
  const wishlist = new WishlistService(prisma, flags, notifications);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("upserts one item per variant and 404s a foreign delete as not found", async () => {
    const listing = await createOpenListing(prisma);
    const user = await createBuyer(prisma);
    try {
      const created = await wishlist.upsert(user.id, listing.variantId, { targetPriceClp: 50_000 });
      expect(created.targetPriceClp).toBe(50_000);
      expect(created.hit).toBe(false);
      const updated = await wishlist.upsert(user.id, listing.variantId, { targetPriceClp: 90_000 });
      expect(updated.id).toBe(created.id);
      expect(updated.hit).toBe(true);
      const page = await wishlist.list(user.id, 1, 20);
      expect(page.total).toBe(1);
      await expect(wishlist.remove(listing.sellerId, listing.variantId)).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
      });
      await wishlist.remove(user.id, listing.variantId);
      const empty = await wishlist.list(user.id, 1, 20);
      expect(empty.total).toBe(0);
    } finally {
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listing.sellerId, user.id],
        listingId: listing.listingId,
        variantId: listing.variantId,
        gameId: listing.gameId,
      });
    }
  });

  it("notifies WISHLIST_HIT once per listing+price and again if it drops", async () => {
    const listing = await createOpenListing(prisma);
    const user = await createBuyer(prisma);
    try {
      await wishlist.upsert(user.id, listing.variantId, { targetPriceClp: 90_000 });
      const first = await wishlist.checkVariant(listing.variantId);
      expect(first.hits).toBe(1);
      const second = await wishlist.checkVariant(listing.variantId);
      expect(second.hits).toBe(0);
      await prisma.listing.update({ where: { id: listing.listingId }, data: { priceClp: 40_000 } });
      const third = await wishlist.checkVariant(listing.variantId);
      expect(third.hits).toBe(1);
      const inbox = await notifications.list(user.id, 1, 20);
      expect(inbox.total).toBe(2);
      expect(inbox.items.every((row) => row.type === "WISHLIST_HIT")).toBe(true);
    } finally {
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.wishlistItem.deleteMany({ where: { userId: user.id } });
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listing.sellerId, user.id],
        listingId: listing.listingId,
        variantId: listing.variantId,
        gameId: listing.gameId,
      });
    }
  });

  it("emits PRICE_DROP only after in-app opt-in", async () => {
    const listing = await createOpenListing(prisma);
    const user = await createBuyer(prisma);
    try {
      await prisma.cardPrice.create({
        data: {
          variantId: listing.variantId,
          source: "LISTING_MIN",
          priceClp: 100_000,
          capturedOn: addUtcDays(utcDateOnly(), -7),
        },
      });
      await wishlist.upsert(user.id, listing.variantId, { targetPriceClp: 50_000 });
      const off = await wishlist.checkVariant(listing.variantId);
      expect(off.drops).toBe(0);
      await notifications.patchPreference(user.id, { type: "PRICE_DROP", inApp: true });
      const on = await wishlist.checkVariant(listing.variantId);
      expect(on.drops).toBe(1);
      const again = await wishlist.checkVariant(listing.variantId);
      expect(again.drops).toBe(0);
      const inbox = await notifications.list(user.id, 1, 20);
      expect(inbox.items.some((row) => row.type === "PRICE_DROP")).toBe(true);
    } finally {
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.notificationPreference.deleteMany({ where: { userId: user.id } });
      await prisma.wishlistItem.deleteMany({ where: { userId: user.id } });
      await prisma.cardPrice.deleteMany({ where: { variantId: listing.variantId } });
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listing.sellerId, user.id],
        listingId: listing.listingId,
        variantId: listing.variantId,
        gameId: listing.gameId,
      });
    }
  });
});
