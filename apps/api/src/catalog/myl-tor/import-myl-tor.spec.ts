import { beforeEach, describe, expect, it, vi } from "vitest";
import { importMylTorCatalog } from "./import-myl-tor";
import type { TorEditionPayload } from "./map-card";

const payload: TorEditionPayload = {
  status: "OK",
  edition: { id: "19", slug: "espada-sagrada", title: "Espada Sagrada" },
  races: [{ id: "1", slug: "caballero", name: "Caballero" }],
  types: [{ id: "1", slug: "aliado", name: "Aliado" }],
  rarities: [{ id: "4", slug: "ultra-real", name: "Ultra Real" }],
  keywords: [],
  cards: [
    {
      id: "1",
      edid: "001",
      slug: "rey-arturo-pendragon",
      name: "rey arturo pendragon",
      rarity: "4",
      race: "1",
      type: "1",
      keywords: "0",
      cost: "5",
      damage: "2",
      ability: "Habilidad oficial.",
      flavour: "Historia oficial.",
    },
  ],
};

function prismaMock() {
  return {
    tcgGame: {
      upsert: vi.fn().mockResolvedValue({ id: "game-1", slug: "mitos-y-leyendas" }),
      findUnique: vi.fn(),
    },
    tcgSet: {
      findFirst: vi.fn().mockResolvedValue({ id: "set-1", slug: "espada-sagrada", code: "TOR19" }),
      update: vi.fn(),
      create: vi.fn(),
    },
    card: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "card-1" }),
      update: vi.fn(),
    },
    cardVariant: {
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
}

describe("importMylTorCatalog provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not overwrite an approved canonical card", async () => {
    const prisma = prismaMock();
    prisma.card.findUnique.mockResolvedValue({
      id: "card-1",
      slug: "rey-arturo-pendragon",
      imageUrl: null,
      attributes: { source: "catalog-submission", verified: false },
    });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    const summary = await importMylTorCatalog(prisma as never, {
      editionSlug: "espada-sagrada",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: "2026-09-11T00:00:00.000Z",
      delayMs: 0,
    });
    expect(summary.conflicts).toBe(1);
    expect(summary.imported).toBe(0);
    expect(prisma.card.create).not.toHaveBeenCalled();
    expect(prisma.card.update).not.toHaveBeenCalled();
  });

  it("updates cards owned by TOR or the demo pack", async () => {
    const prisma = prismaMock();
    prisma.card.findUnique.mockResolvedValue({
      id: "card-1",
      slug: "rey-arturo-pendragon",
      imageUrl: null,
      attributes: { source: "myl-demo-pack", verified: false },
    });
    prisma.card.update.mockResolvedValue({ id: "card-1" });
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    const summary = await importMylTorCatalog(prisma as never, {
      editionSlug: "espada-sagrada",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: "2026-09-11T00:00:00.000Z",
      delayMs: 0,
    });
    expect(summary.updated).toBe(1);
    expect(summary.conflicts).toBe(0);
    expect(prisma.card.update).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });
});
