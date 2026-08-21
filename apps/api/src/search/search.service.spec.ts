import { describe, expect, it, vi, beforeEach } from "vitest";
import { searchCardsQuerySchema } from "@tcg/validation";
import { SearchService } from "./search.service";
import { escapeLike, hasSearchCriteria } from "./search.util";

describe("search utils", () => {
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("100%_foil\\")).toBe("100\\%\\_foil\\\\");
  });

  it("requires at least one criterion", () => {
    expect(hasSearchCriteria({})).toBe(false);
    expect(hasSearchCriteria({ q: "bolt" })).toBe(true);
    expect(hasSearchCriteria({ game: "magic" })).toBe(true);
  });
});

describe("searchCardsQuerySchema", () => {
  it("defaults pagination and sort", () => {
    expect(searchCardsQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      sort: "relevance",
    });
  });

  it("treats empty strings as omitted filters", () => {
    const parsed = searchCardsQuerySchema.parse({ q: "  test  ", game: "", language: "" });
    expect(parsed.q).toBe("test");
    expect(parsed.game).toBeUndefined();
    expect(parsed.language).toBeUndefined();
  });

  it("rejects unknown language", () => {
    expect(() => searchCardsQuerySchema.parse({ language: "XX" })).toThrow();
  });
});

describe("SearchService", () => {
  const prisma = {
    $queryRaw: vi.fn(),
    card: { findMany: vi.fn() },
  };
  const service = new SearchService(prisma as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not query the database without criteria", async () => {
    await expect(service.searchCards({ page: 1, pageSize: 20, sort: "relevance" })).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("maps ranked ids to card summaries", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 1n }])
      .mockResolvedValueOnce([{ id: "card-1" }]);
    prisma.card.findMany.mockResolvedValue([
      {
        id: "card-1",
        slug: "test-mon-1",
        name: "Test Mon #1",
        number: "001",
        rarity: "Common",
        imageUrl: null,
        set: {
          slug: "test-set",
          name: "Set de prueba",
          code: "TEST",
          game: { slug: "pokemon", name: "Pokémon" },
        },
      },
    ]);
    await expect(service.searchCards({ q: "test", page: 1, pageSize: 20, sort: "relevance" })).resolves.toEqual({
      items: [
        {
          id: "card-1",
          slug: "test-mon-1",
          name: "Test Mon #1",
          number: "001",
          rarity: "Common",
          imageUrl: null,
          gameSlug: "pokemon",
          gameName: "Pokémon",
          setSlug: "test-set",
          setName: "Set de prueba",
          setCode: "TEST",
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });
});
