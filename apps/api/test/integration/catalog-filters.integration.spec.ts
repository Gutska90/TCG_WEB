import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { PrismaService } from "../../src/prisma/prisma.service";
import { SearchService } from "../../src/search/search.service";
import { MetricsService } from "../../src/observability/metrics.service";
import { AppError } from "../../src/common/errors/app-error";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("CATALOG.1 game filters (postgres)", () => {
  const prisma = new PrismaService();
  const search = new SearchService(prisma, new MetricsService());
  const suffix = randomUUID().slice(0, 8);
  const createdSetIds: string[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
    await prisma.$connect();
  });

  afterAll(async () => {
    if (createdSetIds.length) {
      await prisma.tcgSet.deleteMany({ where: { id: { in: createdSetIds } } });
    }
    await prisma.$disconnect();
  });

  it("filters Pokémon Fire Stage 2, Magic Instant MV, Yu-Gi-Oh DARK Dragon, MyL Aliado", async () => {
    const pokemonSet = await seedCanonical(prisma, {
      slug: "pokemon",
      name: "Pokémon",
      publisher: "The Pokémon Company",
      setSlug: `c1-poke-${suffix}`,
      card: {
        name: `Filter Ember ${suffix}`,
        rarity: "Rare",
        supertype: "Pokémon",
        attributes: { cardType: "POKEMON", pokemonType: ["FIRE"], stage: "STAGE_2", hp: 140 },
      },
    });
    const magicSet = await seedCanonical(prisma, {
      slug: "magic",
      name: "Magic: The Gathering",
      publisher: "Wizards of the Coast",
      setSlug: `c1-mag-${suffix}`,
      card: {
        name: `Filter Instant ${suffix}`,
        rarity: "Common",
        supertype: "Instant",
        attributes: { cardType: "Instant", colors: ["U"], manaValue: 2 },
      },
    });
    const ygoSet = await seedCanonical(prisma, {
      slug: "yugioh",
      name: "Yu-Gi-Oh!",
      publisher: "Konami",
      setSlug: `c1-ygo-${suffix}`,
      card: {
        name: `Filter Dragon ${suffix}`,
        rarity: "Rare",
        supertype: "Monster",
        attributes: {
          category: "MONSTER",
          attribute: "DARK",
          monsterType: ["DRAGON"],
          cardTypes: ["FUSION"],
          atk: 2800,
        },
      },
    });
    const mylSet = await seedCanonical(prisma, {
      slug: "mitos-y-leyendas",
      name: "Mitos y Leyendas",
      publisher: "Fénix",
      setSlug: `c1-myl-${suffix}`,
      card: {
        name: `Filter Aliado ${suffix}`,
        rarity: "Common",
        supertype: "Aliado",
        attributes: { cardType: "ALIADO", raza: "ANDINO", coste: 2, fuerza: 2 },
      },
    });
    createdSetIds.push(pokemonSet, magicSet, ygoSet, mylSet);

    const fire = await search.searchCards({
      page: 1,
      pageSize: 20,
      sort: "relevance",
      game: "pokemon",
      set: `c1-poke-${suffix}`,
      attrs: { pokemonType: ["FIRE"], stage: ["STAGE_2"] },
    });
    expect(fire.items.map((row) => row.name)).toEqual([`Filter Ember ${suffix}`]);

    const hp = await search.searchCards({
      page: 1,
      pageSize: 20,
      sort: "relevance",
      game: "pokemon",
      set: `c1-poke-${suffix}`,
      rarity: "Rare",
      attrs: { pokemonType: ["FIRE"], hpMin: ["100"], hpMax: ["200"] },
    });
    expect(hp.items.map((row) => row.name)).toEqual([`Filter Ember ${suffix}`]);

    const instant = await search.searchCards({
      page: 1,
      pageSize: 20,
      sort: "relevance",
      game: "magic",
      set: `c1-mag-${suffix}`,
      attrs: { colors: ["U"], cardType: ["Instant"], manaValueMax: ["3"] },
    });
    expect(instant.items.map((row) => row.name)).toEqual([`Filter Instant ${suffix}`]);

    const dragon = await search.searchCards({
      page: 1,
      pageSize: 20,
      sort: "relevance",
      game: "yugioh",
      set: `c1-ygo-${suffix}`,
      attrs: { attribute: ["DARK"], monsterType: ["DRAGON"], cardTypes: ["FUSION"] },
    });
    expect(dragon.items.map((row) => row.name)).toEqual([`Filter Dragon ${suffix}`]);

    const aliado = await search.searchCards({
      page: 1,
      pageSize: 20,
      sort: "relevance",
      game: "mitos-y-leyendas",
      set: `c1-myl-${suffix}`,
      attrs: { cardType: ["ALIADO"], raza: ["Andino"] },
    });
    expect(aliado.items.map((row) => row.name)).toEqual([`Filter Aliado ${suffix}`]);

    await expect(
      search.searchCards({
        page: 1,
        pageSize: 20,
        sort: "relevance",
        game: "magic",
        attrs: { pokemonType: ["FIRE"] },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.FILTER_NOT_SUPPORTED_FOR_GAME });
    expect(AppError).toBeTruthy();
  });
});

async function seedCanonical(
  prisma: PrismaService,
  input: {
    slug: string;
    name: string;
    publisher: string;
    setSlug: string;
    card: { name: string; rarity: string; supertype: string; attributes: Record<string, unknown> };
  },
): Promise<string> {
  const game = await prisma.tcgGame.upsert({
    where: { slug: input.slug },
    update: { isActive: true, name: input.name },
    create: { slug: input.slug, name: input.name, publisher: input.publisher, sortOrder: 40, isActive: true },
  });
  const set = await prisma.tcgSet.create({
    data: {
      gameId: game.id,
      code: input.setSlug.slice(0, 8).toUpperCase(),
      slug: input.setSlug,
      name: input.setSlug,
    },
  });
  await prisma.card.create({
    data: {
      setId: set.id,
      number: "C1",
      slug: input.card.name.toLowerCase().replace(/\s+/g, "-"),
      name: input.card.name,
      rarity: input.card.rarity,
      supertype: input.card.supertype,
      attributes: input.card.attributes,
    },
  });
  return set.id;
}
