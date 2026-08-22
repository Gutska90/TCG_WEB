import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { CatalogService } from "./catalog.service";

describe("CatalogService", () => {
  const prisma = {
    tcgGame: { findMany: vi.fn(), findFirst: vi.fn() },
    tcgSet: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    card: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    cardVariant: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  };

  const service = new CatalogService(
    prisma as never,
    { summarizeForCard: vi.fn() } as never,
    { listPublic: vi.fn() } as never,
    { suggestionForVariant: vi.fn(), history: vi.fn() } as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active games ordered", async () => {
    prisma.tcgGame.findMany.mockResolvedValue([
      { id: "1", slug: "pokemon", name: "Pokémon", publisher: "TPC", sortOrder: 1 },
    ]);
    await expect(service.listGames()).resolves.toEqual([
      { id: "1", slug: "pokemon", name: "Pokémon", publisher: "TPC", sortOrder: 1 },
    ]);
  });

  it("404s unknown games", async () => {
    prisma.tcgGame.findFirst.mockResolvedValue(null);
    await expect(service.getGame("nope")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });

  it("404s unknown cards", async () => {
    prisma.card.findUnique.mockResolvedValue(null);
    await expect(service.getCard("missing")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });
});
