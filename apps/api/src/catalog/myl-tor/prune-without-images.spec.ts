import { beforeEach, describe, expect, it, vi } from "vitest";
import { pruneMylCardsWithoutImages } from "./prune-without-images";

function prismaMock() {
  return {
    card: {
      findMany: vi.fn().mockResolvedValue([{ id: "card-1" }, { id: "card-2" }]),
      deleteMany: vi.fn(),
    },
    cardVariant: {
      findMany: vi.fn().mockResolvedValue([
        { id: "var-1", cardId: "card-1" },
        { id: "var-2", cardId: "card-2" },
      ]),
    },
    orderItem: {
      findMany: vi.fn().mockResolvedValue([{ variantId: "var-2" }]),
    },
    listing: {
      findMany: vi.fn().mockResolvedValue([{ id: "list-1" }]),
      deleteMany: vi.fn(),
    },
    listingRevision: { deleteMany: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    report: { deleteMany: vi.fn() },
    collectionItem: { deleteMany: vi.fn() },
    tcgSet: {
      findMany: vi.fn().mockResolvedValue([{ id: "set-empty" }]),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn(prismaMockTx())),
  };
}

function prismaMockTx() {
  return {
    listingRevision: { deleteMany: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    report: { deleteMany: vi.fn() },
    listing: { deleteMany: vi.fn() },
    collectionItem: { deleteMany: vi.fn() },
    card: { deleteMany: vi.fn() },
  };
}

describe("pruneMylCardsWithoutImages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes MyL cards without art and skips variants tied to orders", async () => {
    const prisma = prismaMock();
    const tx = prismaMockTx();
    prisma.$transaction.mockImplementation(async (fn: (client: unknown) => Promise<void>) => fn(tx));
    const summary = await pruneMylCardsWithoutImages(prisma as never);
    expect(summary.cards).toBe(1);
    expect(summary.listings).toBe(1);
    expect(summary.sets).toBe(1);
    expect(summary.skippedWithOrders).toBe(1);
    expect(tx.card.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["card-1"] } } });
  });
});
