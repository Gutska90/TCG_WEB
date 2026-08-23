import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { flagsForTest } from "../flags/feature-flags.service";
import { CollectionsService } from "./collections.service";

const userId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
const variantId = "33333333-3333-4333-8333-333333333333";
const collectionId = "44444444-4444-4444-8444-444444444444";
const itemId = "55555555-5555-4555-8555-555555555555";

const variant = {
  id: variantId,
  language: "EN",
  finish: "NORMAL",
  finishDetail: "",
  isDefault: true,
  card: {
    id: "card-1",
    slug: "it-card",
    name: "IT Card",
    number: "001",
    rarity: "Rare",
    imageUrl: null,
    set: { slug: "it-set", game: { slug: "it-game" } },
  },
};

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: itemId,
    collectionId,
    variantId,
    condition: "NM",
    quantity: 2,
    purchasePriceClp: 10_000,
    purchasedAt: null,
    notes: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    variant,
    ...overrides,
  };
}

describe("CollectionsService", () => {
  const prisma = {
    collection: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    collectionItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    collectionValueSnapshot: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
    cardVariant: { findUnique: vi.fn() },
    listing: { findMany: vi.fn() },
    auditLog: { findFirst: vi.fn() },
    tcgSet: { findUnique: vi.fn(), findMany: vi.fn() },
    card: { count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
  const service = new CollectionsService(prisma as never, flagsForTest({ enableCollections: true }), {
    log: vi.fn(),
  } as never);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.collection.findUnique.mockResolvedValue({
      id: collectionId,
      userId,
      name: "Default",
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.listing.findMany.mockResolvedValue([]);
  });

  it("creates a lot when adding an item", async () => {
    prisma.cardVariant.findUnique.mockResolvedValue(variant);
    prisma.collectionItem.create.mockResolvedValue(itemRow());
    const view = await service.addItem(userId, {
      variantId,
      condition: "NM",
      quantity: 2,
      purchasePriceClp: 10_000,
    });
    expect(view.quantity).toBe(2);
    expect(view.registeredCostClp).toBe(20_000);
    expect(view.estimatedValueClp).toBeNull();
  });

  it("404s unknown variants", async () => {
    prisma.cardVariant.findUnique.mockResolvedValue(null);
    await expect(
      service.addItem(userId, { variantId, condition: "NM", quantity: 1 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, status: HttpStatus.NOT_FOUND });
  });

  it("404s foreign items (no IDOR leak)", async () => {
    prisma.collectionItem.findFirst.mockResolvedValue(null);
    await expect(service.getItem(otherId, itemId)).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
    await expect(service.patchItem(otherId, itemId, { quantity: 3 })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
    });
    await expect(service.deleteItem(otherId, itemId)).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
    });
  });

  it("updates quantity on an owned lot", async () => {
    prisma.collectionItem.findFirst.mockResolvedValue(itemRow());
    prisma.collectionItem.update.mockResolvedValue(itemRow({ quantity: 5 }));
    const view = await service.patchItem(userId, itemId, { quantity: 5 });
    expect(view.quantity).toBe(5);
    expect(view.registeredCostClp).toBe(50_000);
  });

  it("deletes an owned lot", async () => {
    prisma.collectionItem.findFirst.mockResolvedValue(itemRow());
    prisma.collectionItem.delete.mockResolvedValue(itemRow());
    await service.deleteItem(userId, itemId);
    expect(prisma.collectionItem.delete).toHaveBeenCalledWith({ where: { id: itemId } });
  });
});
