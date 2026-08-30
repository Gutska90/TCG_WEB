import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { CatalogService } from "../../src/catalog/catalog.service";
import { MetricsService } from "../../src/observability/metrics.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { SearchService } from "../../src/search/search.service";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("SHOW_SYNTHETIC_CATALOG=false hides showcase cards (postgres)", () => {
  const prisma = new PrismaService();
  const search = new SearchService(prisma, new MetricsService());
  const catalog = new CatalogService(
    prisma,
    { summarizeForCard: async () => ({ currency: "CLP", marketPrice: null, minListing: null, avgListing: null, activeListings: 0 }) } as never,
    { listPublic: async () => ({ items: [], page: 1, pageSize: 50, total: 0 }) } as never,
    { suggestionForVariant: async () => null, history: async () => [] } as never,
  );
  const suffix = randomUUID().slice(0, 8);
  let setId = "";
  let cardId = "";
  const previous = process.env.SHOW_SYNTHETIC_CATALOG;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
    await prisma.$connect();
    const game = await prisma.tcgGame.upsert({
      where: { slug: "pokemon" },
      update: { isActive: true },
      create: {
        slug: "pokemon",
        name: "Pokémon",
        publisher: "The Pokémon Company",
        sortOrder: 1,
        isActive: true,
      },
    });
    const set = await prisma.tcgSet.create({
      data: {
        gameId: game.id,
        code: `SYN${suffix.slice(0, 5).toUpperCase()}`,
        slug: `synthetic-${suffix}`,
        name: `Synthetic ${suffix}`,
      },
    });
    setId = set.id;
    const card = await prisma.card.create({
      data: {
        setId: set.id,
        number: "S1",
        slug: `ember-hide-${suffix}`,
        name: `Hide Ember ${suffix}`,
        rarity: "Common",
        supertype: "Pokémon",
        attributes: { source: "synthetic-showcase", sourceQuality: "SYNTHETIC", pokemonTypes: ["FIRE"] },
      },
    });
    cardId = card.id;
  });

  afterEach(() => {
    process.env.SHOW_SYNTHETIC_CATALOG = previous;
  });

  afterAll(async () => {
    process.env.SHOW_SYNTHETIC_CATALOG = previous;
    if (setId) await prisma.tcgSet.deleteMany({ where: { id: setId } });
    await prisma.$disconnect();
  });

  it("omits synthetic cards from search, set lists, and card GET", async () => {
    process.env.SHOW_SYNTHETIC_CATALOG = "false";
    const found = await search.searchCards({
      page: 1,
      pageSize: 20,
      sort: "relevance",
      game: "pokemon",
      q: `Hide Ember ${suffix}`,
    });
    expect(found.items.some((row) => row.id === cardId)).toBe(false);

    const sets = await catalog.listSets("pokemon");
    expect(sets.some((row) => row.id === setId)).toBe(false);

    await expect(catalog.getSetBySlug("pokemon", `synthetic-${suffix}`)).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
    });
    await expect(catalog.getCard(cardId)).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND });
  });

  it("still returns them when the flag is true", async () => {
    process.env.SHOW_SYNTHETIC_CATALOG = "true";
    const found = await search.searchCards({
      page: 1,
      pageSize: 20,
      sort: "relevance",
      game: "pokemon",
      q: `Hide Ember ${suffix}`,
    });
    expect(found.items.some((row) => row.id === cardId)).toBe(true);
    const card = await catalog.getCard(cardId);
    expect(card.name).toBe(`Hide Ember ${suffix}`);
  });
});
