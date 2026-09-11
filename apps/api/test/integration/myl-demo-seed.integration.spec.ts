import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";
import { MYL_DEMO_CARDS } from "../../src/catalog/myl-demo/cards";
import { seedMylDemo } from "../../src/catalog/myl-demo/seed-myl-demo";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("MyL demo seed (postgres)", () => {
  const prisma = new PrismaService();

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates game/sets/cards/listings idempotently", async () => {
    expect(MYL_DEMO_CARDS.length).toBeGreaterThanOrEqual(150);
    const first = await seedMylDemo(prisma);
    const second = await seedMylDemo(prisma);
    const game = await prisma.tcgGame.findUnique({ where: { slug: "mitos-y-leyendas" } });
    expect(game).toBeTruthy();
    const sets = await prisma.tcgSet.count({ where: { gameId: game!.id } });
    expect(sets).toBeGreaterThanOrEqual(6);
    const cards = await prisma.card.count({ where: { set: { gameId: game!.id } } });
    expect(cards).toBeGreaterThanOrEqual(150);
    const sellers = await prisma.user.count({
      where: { email: { endsWith: "@example.test" }, slug: { in: ["mitos-store", "cartas-valparaiso", "mazo-nunoa", "imperio-tcg", "cartas-del-sur"] } },
    });
    expect(sellers).toBe(5);
    const listings = await prisma.listing.count({
      where: { seller: { slug: { in: ["mitos-store", "cartas-valparaiso", "mazo-nunoa", "imperio-tcg", "cartas-del-sur"] } }, status: "ACTIVE" },
    });
    expect(listings).toBeGreaterThanOrEqual(300);
    expect(second.cards).toBe(first.cards);
    expect(second.sellers).toBe(first.sellers);
  }, 120_000);
});
