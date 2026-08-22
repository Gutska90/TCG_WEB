import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { PrismaService } from "../../src/prisma/prisma.service";
import { CollectionsService } from "../../src/collections/collections.service";
import { AuditService } from "../../src/audit/audit.service";
import { flagsForTest } from "../../src/flags/feature-flags.service";
import { createBuyer } from "./helpers/market-fixture";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("Fase 12 collections (postgres)", () => {
  const prisma = new PrismaService();
  const collections = new CollectionsService(
    prisma,
    flagsForTest({ enableCollections: true }),
    new AuditService(prisma),
  );

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function catalog(cards = 2) {
    const suffix = randomUUID().slice(0, 8);
    const game = await prisma.tcgGame.create({
      data: { slug: `col-game-${suffix}`, name: "Col Game", publisher: "IT", sortOrder: 99 },
    });
    const set = await prisma.tcgSet.create({
      data: { gameId: game.id, code: `CG${suffix.slice(0, 4)}`, slug: `col-set-${suffix}`, name: "Col Set" },
    });
    const createdCards = [];
    for (let i = 0; i < cards; i += 1) {
      const card = await prisma.card.create({
        data: {
          setId: set.id,
          number: `${i + 1}`.padStart(3, "0"),
          slug: `col-card-${suffix}-${i}`,
          name: `Col Card ${i + 1}`,
          rarity: "Rare",
          supertype: "Creature",
        },
      });
      const variant = await prisma.cardVariant.create({
        data: { cardId: card.id, language: "EN", finish: "NORMAL", isDefault: true },
      });
      createdCards.push({ card, variant });
    }
    const owner = await createBuyer(prisma);
    const stranger = await createBuyer(prisma);
    return { suffix, game, set, createdCards, owner, stranger };
  }

  async function cleanup(input: {
    userIds: string[];
    gameId: string;
    listingIds?: string[];
  }) {
    await prisma.listing.deleteMany({ where: { id: { in: input.listingIds ?? [] } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: input.userIds } } });
    await prisma.collectionItem.deleteMany({ where: { collection: { userId: { in: input.userIds } } } });
    await prisma.collection.deleteMany({ where: { userId: { in: input.userIds } } });
    const variants = await prisma.cardVariant.findMany({
      where: { card: { set: { gameId: input.gameId } } },
      select: { id: true },
    });
    await prisma.cardVariant.deleteMany({ where: { id: { in: variants.map((row) => row.id) } } });
    await prisma.card.deleteMany({ where: { set: { gameId: input.gameId } } });
    await prisma.tcgSet.deleteMany({ where: { gameId: input.gameId } });
    await prisma.tcgGame.deleteMany({ where: { id: input.gameId } });
    await prisma.profile.deleteMany({ where: { userId: { in: input.userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: input.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: input.userIds } } });
  }

  it("creates a default collection and adds lots without merging distinct costs", async () => {
    const fx = await catalog(2);
    try {
      const list = await collections.listCollections(fx.owner.id);
      expect(list).toHaveLength(1);
      expect(list[0]?.isDefault).toBe(true);

      const a = await collections.addItem(fx.owner.id, {
        variantId: fx.createdCards[0]!.variant.id,
        condition: "NM",
        quantity: 2,
        purchasePriceClp: 10_000,
      });
      const b = await collections.addItem(fx.owner.id, {
        variantId: fx.createdCards[0]!.variant.id,
        condition: "NM",
        quantity: 3,
        purchasePriceClp: 15_000,
      });
      expect(a.id).not.toBe(b.id);

      const [first, second] = await Promise.all([
        collections.addItem(fx.owner.id, {
          variantId: fx.createdCards[0]!.variant.id,
          condition: "LP",
          quantity: 1,
        }),
        collections.addItem(fx.owner.id, {
          variantId: fx.createdCards[1]!.variant.id,
          condition: "NM",
          quantity: 1,
        }),
      ]);
      expect(first.id).not.toBe(second.id);

      const paged = await collections.listItems(fx.owner.id, {
        page: 1,
        pageSize: 2,
        sort: "recent",
        duplicates: false,
      });
      expect(paged.total).toBe(4);
      expect(paged.items).toHaveLength(2);

      const summary = await collections.summary(fx.owner.id);
      expect(summary.totalCards).toBe(7);
      expect(summary.uniqueCards).toBe(2);
      expect(summary.registeredCostClp).toBe(2 * 10_000 + 3 * 15_000);
      expect(summary.itemsWithoutCost).toBe(2);
      expect(summary.estimatedValueClp).toBeNull();
      expect(summary.estimatedPlClp).toBeNull();
      expect(summary.duplicateCards).toBe(1);
      expect(summary.extraCopies).toBe(5);
      expect(summary.change30dClp).toBeNull();

      const progress = await collections.listSetProgress(fx.owner.id);
      expect(progress).toHaveLength(1);
      expect(progress[0]?.ownedUnique).toBe(2);
      expect(progress[0]?.total).toBe(2);
      expect(progress[0]?.percentage).toBe(100);
      expect(progress[0]?.missing).toBe(0);
    } finally {
      await cleanup({ userIds: [fx.owner.id, fx.stranger.id], gameId: fx.game.id });
    }
  });

  it("returns 404 for another user's collection item", async () => {
    const fx = await catalog(1);
    try {
      const item = await collections.addItem(fx.owner.id, {
        variantId: fx.createdCards[0]!.variant.id,
        condition: "NM",
        quantity: 1,
      });
      await expect(collections.getItem(fx.stranger.id, item.id)).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
      });
      await expect(collections.getCollection(fx.stranger.id, item.collectionId)).rejects.toMatchObject({
        code: ERROR_CODES.NOT_FOUND,
      });
    } finally {
      await cleanup({ userIds: [fx.owner.id, fx.stranger.id], gameId: fx.game.id });
    }
  });

  it("estimates from active listings and excludes missing market prices from P/L", async () => {
    const fx = await catalog(2);
    const listingIds: string[] = [];
    try {
      const listingA = await prisma.listing.create({
        data: {
          sellerId: fx.owner.id,
          variantId: fx.createdCards[0]!.variant.id,
          productType: "SINGLE",
          title: "A",
          condition: "NM",
          quantity: 1,
          priceClp: 20_000,
          status: "ACTIVE",
          allowsMeetup: true,
          allowsShipping: true,
          publishedAt: new Date(),
        },
      });
      const listingB = await prisma.listing.create({
        data: {
          sellerId: fx.owner.id,
          variantId: fx.createdCards[0]!.variant.id,
          productType: "SINGLE",
          title: "B",
          condition: "NM",
          quantity: 1,
          priceClp: 30_000,
          status: "ACTIVE",
          allowsMeetup: true,
          allowsShipping: true,
          publishedAt: new Date(),
        },
      });
      listingIds.push(listingA.id, listingB.id);

      await collections.addItem(fx.owner.id, {
        variantId: fx.createdCards[0]!.variant.id,
        condition: "NM",
        quantity: 2,
        purchasePriceClp: 18_000,
      });
      await collections.addItem(fx.owner.id, {
        variantId: fx.createdCards[1]!.variant.id,
        condition: "NM",
        quantity: 1,
        purchasePriceClp: 5_000,
      });

      const summary = await collections.summary(fx.owner.id);
      expect(summary.estimatedValueClp).toBe(2 * 25_000);
      expect(summary.itemsWithoutEstimate).toBe(1);
      expect(summary.registeredCostClp).toBe(2 * 18_000 + 5_000);
      expect(summary.estimatedPlClp).toBe((25_000 - 18_000) * 2);
      expect(summary.itemsInPl).toBe(2);

      const missing = await collections.setDetail(fx.owner.id, fx.set.id, 1, 20);
      expect(missing.progress.ownedUnique).toBe(2);
      expect(missing.missing.total).toBe(0);

      const updated = await collections.patchItem(fx.owner.id, (await collections.listItems(fx.owner.id, {
        page: 1,
        pageSize: 20,
        sort: "recent",
        duplicates: false,
      })).items[0]!.id, { quantity: 4 });
      expect(updated.quantity).toBe(4);

      await collections.deleteItem(fx.owner.id, updated.id);
      const after = await collections.summary(fx.owner.id);
      expect(after.uniqueCards).toBe(1);
    } finally {
      await cleanup({ userIds: [fx.owner.id, fx.stranger.id], gameId: fx.game.id, listingIds });
    }
  });

  it("lists missing cards and counts those with active listings", async () => {
    const fx = await catalog(3);
    const listingIds: string[] = [];
    try {
      await collections.addItem(fx.owner.id, {
        variantId: fx.createdCards[0]!.variant.id,
        condition: "NM",
        quantity: 1,
      });
      const listing = await prisma.listing.create({
        data: {
          sellerId: fx.owner.id,
          variantId: fx.createdCards[1]!.variant.id,
          productType: "SINGLE",
          title: "Missing has listing",
          condition: "NM",
          quantity: 1,
          priceClp: 4_000,
          status: "ACTIVE",
          allowsMeetup: true,
          allowsShipping: true,
          publishedAt: new Date(),
        },
      });
      listingIds.push(listing.id);
      const detail = await collections.setDetail(fx.owner.id, fx.set.id, 1, 20);
      expect(detail.progress.ownedUnique).toBe(1);
      expect(detail.progress.missing).toBe(2);
      expect(detail.progress.missingWithActiveListings).toBe(1);
      expect(detail.missing.total).toBe(2);
      expect(detail.missing.items.some((row) => row.hasActiveListing)).toBe(true);
    } finally {
      await cleanup({ userIds: [fx.owner.id, fx.stranger.id], gameId: fx.game.id, listingIds });
    }
  });

  it("decrements source collection lots on completed sale, once per order", async () => {
    const fx = await catalog(1);
    const listingIds: string[] = [];
    try {
      const lot = await collections.addItem(fx.owner.id, {
        variantId: fx.createdCards[0]!.variant.id,
        condition: "NM",
        quantity: 3,
      });
      const listing = await prisma.listing.create({
        data: {
          sellerId: fx.owner.id,
          variantId: fx.createdCards[0]!.variant.id,
          productType: "SINGLE",
          title: "From collection",
          condition: "NM",
          quantity: 1,
          priceClp: 8_000,
          status: "ACTIVE",
          allowsMeetup: true,
          allowsShipping: true,
          publishedAt: new Date(),
          sourceCollectionItemId: lot.id,
        },
      });
      listingIds.push(listing.id);
      const orderId = randomUUID();
      await collections.applySaleDeduction(orderId, fx.owner.id, [{ listingId: listing.id, quantity: 1 }]);
      const after = await collections.getItem(fx.owner.id, lot.id);
      expect(after.quantity).toBe(2);
      await collections.applySaleDeduction(orderId, fx.owner.id, [{ listingId: listing.id, quantity: 1 }]);
      const again = await collections.getItem(fx.owner.id, lot.id);
      expect(again.quantity).toBe(2);
    } finally {
      await cleanup({ userIds: [fx.owner.id, fx.stranger.id], gameId: fx.game.id, listingIds });
    }
  });
});
