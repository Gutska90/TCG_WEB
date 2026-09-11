import { beforeEach, describe, expect, it, vi } from "vitest";
import { MYL_DEMO_CARDS } from "./cards";
import {
  cardAttributeSource,
  importMylDemoCards,
  isMylDemoPackCard,
  MYL_DEMO_SOURCE,
} from "./import-myl";

const brunhild = MYL_DEMO_CARDS[0]!;

function prismaMock() {
  return {
    tcgGame: {
      upsert: vi.fn().mockResolvedValue({ id: "game-1", slug: "mitos-y-leyendas" }),
      findUnique: vi.fn(),
    },
    tcgSet: {
      findFirst: vi.fn().mockResolvedValue({ id: "set-1", slug: brunhild.set.slug, code: brunhild.set.code }),
      update: vi.fn(),
      create: vi.fn(),
    },
    card: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      upsert: vi.fn().mockResolvedValue({ id: "card-1" }),
    },
    cardVariant: {
      upsert: vi.fn(),
    },
  };
}

describe("MyL demo importer provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads attribute source and only treats myl-demo-pack as owned", () => {
    expect(cardAttributeSource({ source: "catalog-submission", verified: false })).toBe("catalog-submission");
    expect(isMylDemoPackCard({ source: "catalog-submission", verified: false })).toBe(false);
    expect(isMylDemoPackCard({ source: MYL_DEMO_SOURCE, verified: false })).toBe(true);
    expect(isMylDemoPackCard({})).toBe(false);
  });

  it("does not overwrite an approved canonical card", async () => {
    const prisma = prismaMock();
    prisma.card.findUnique.mockResolvedValue({
      id: "card-1",
      slug: "brunhild",
      imageUrl: null,
      attributes: { source: "catalog-submission", sourceQuality: "CURATED_VERIFIED", verified: false },
    });
    const summary = await importMylDemoCards(prisma as never, [brunhild]);
    expect(summary.conflicts).toBe(1);
    expect(summary.updated).toBe(0);
    expect(prisma.card.upsert).not.toHaveBeenCalled();
  });

  it("updates cards that already belong to the demo pack", async () => {
    const prisma = prismaMock();
    prisma.card.findUnique.mockResolvedValue({
      id: "card-1",
      slug: "brunhild",
      imageUrl: null,
      attributes: { source: MYL_DEMO_SOURCE, verified: false },
    });
    const summary = await importMylDemoCards(prisma as never, [brunhild]);
    expect(summary.updated).toBe(1);
    expect(summary.conflicts).toBe(0);
    expect(prisma.card.upsert).toHaveBeenCalled();
  });

  it("overwrites a foreign card only with --force", async () => {
    const prisma = prismaMock();
    prisma.card.findUnique.mockResolvedValue({
      id: "card-1",
      slug: "brunhild",
      imageUrl: null,
      attributes: { source: "catalog-submission", verified: false },
    });
    const summary = await importMylDemoCards(prisma as never, [brunhild], { force: true });
    expect(summary.updated).toBe(1);
    expect(summary.conflicts).toBe(0);
    expect(prisma.card.upsert).toHaveBeenCalled();
  });
});
