import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";
import { SearchService } from "../../src/search/search.service";
import { MetricsService } from "../../src/observability/metrics.service";
import { seedReferenceCatalog } from "../../src/catalog/reference-catalog/seed";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("CATALOG.2 real taxonomy search (postgres)", () => {
  const prisma = new PrismaService();
  const search = new SearchService(prisma, new MetricsService());
  const suffix = randomUUID().slice(0, 8);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
    await prisma.$connect();
    await seedReferenceCatalog(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(`filters real reference cards ${suffix}`, async () => {
    const grass = await search.searchCards({
      page: 1,
      pageSize: 50,
      sort: "relevance",
      game: "pokemon",
      attrs: { pokemonTypes: ["GRASS"] },
    });
    expect(grass.items.some((row) => row.name === "Venusaur-EX")).toBe(true);

    const eyes = await search.searchCards({
      page: 1,
      pageSize: 50,
      sort: "relevance",
      game: "yugioh",
      attrs: { attribute: ["LIGHT"], atkMin: ["3000"] },
    });
    expect(eyes.items.some((row) => row.name === "Blue-Eyes White Dragon")).toBe(true);

    const mitra = await search.searchCards({
      page: 1,
      pageSize: 50,
      sort: "relevance",
      game: "mitos-y-leyendas",
      attrs: { raza: ["ANCESTRAL"] },
    });
    expect(mitra.items.some((row) => row.name === "Mitra")).toBe(true);

    const shanks = await search.searchCards({
      page: 1,
      pageSize: 50,
      sort: "relevance",
      game: "one-piece",
      attrs: { color: ["RED"], cardType: ["LEADER"] },
    });
    expect(shanks.items.some((row) => row.name === "Shanks")).toBe(true);

    const agumon = await search.searchCards({
      page: 1,
      pageSize: 50,
      sort: "relevance",
      game: "digimon",
      attrs: { form: ["ROOKIE"] },
    });
    expect(agumon.items.some((row) => row.name === "Agumon")).toBe(true);

    const gundam = await search.searchCards({
      page: 1,
      pageSize: 50,
      sort: "relevance",
      game: "gundam",
      attrs: { sourceTitle: ["Mobile Suit Gundam"] },
    });
    expect(gundam.items.some((row) => row.number === "GD01-001")).toBe(true);
  });
});
