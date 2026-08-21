import { SHIPPING_RATE_SEED } from "@tcg/config";
import type { PrismaClient } from "@prisma/client";
import { slugifyStable } from "./slug";

const GAMES = [
  { slug: "pokemon", name: "Pokémon", publisher: "The Pokémon Company", sortOrder: 1 },
  { slug: "magic", name: "Magic: The Gathering", publisher: "Wizards of the Coast", sortOrder: 2 },
  { slug: "one-piece", name: "One Piece", publisher: "Bandai", sortOrder: 3 },
] as const;

const TEST_CARDS = [
  { number: "001", name: "Test Mon #1", rarity: "Common", supertype: "Creature" },
  { number: "002", name: "Test Mon #2", rarity: "Uncommon", supertype: "Creature" },
  { number: "003", name: "Test Spell #1", rarity: "Rare", supertype: "Spell" },
  { number: "004", name: "Test Character #1", rarity: "Super Rare", supertype: "Character" },
] as const;

export async function seedCatalog(prisma: PrismaClient): Promise<{ games: number; cards: number }> {
  let cards = 0;
  for (const gameInput of GAMES) {
    const game = await prisma.tcgGame.upsert({
      where: { slug: gameInput.slug },
      update: { name: gameInput.name, publisher: gameInput.publisher, isActive: true, sortOrder: gameInput.sortOrder },
      create: gameInput,
    });
    const set = await prisma.tcgSet.upsert({
      where: { gameId_slug: { gameId: game.id, slug: "test-set" } },
      update: { name: "Set de prueba", code: "TEST" },
      create: {
        gameId: game.id,
        code: "TEST",
        slug: "test-set",
        name: "Set de prueba",
        releasedAt: new Date("2026-01-01"),
        printedTotal: TEST_CARDS.length,
        total: TEST_CARDS.length,
      },
    });
    for (const cardInput of TEST_CARDS) {
      const slug = slugifyStable(cardInput.name, "card");
      const card = await prisma.card.upsert({
        where: { setId_slug: { setId: set.id, slug } },
        update: {
          name: cardInput.name,
          number: cardInput.number,
          rarity: cardInput.rarity,
          supertype: cardInput.supertype,
        },
        create: {
          setId: set.id,
          slug,
          ...cardInput,
          attributes: { source: "seed" },
        },
      });
      await prisma.cardVariant.upsert({
        where: {
          cardId_language_finish_finishDetail: {
            cardId: card.id,
            language: "EN",
            finish: "NORMAL",
            finishDetail: "",
          },
        },
        update: { isDefault: true },
        create: {
          cardId: card.id,
          language: "EN",
          finish: "NORMAL",
          isDefault: true,
          externalIds: { seed: true },
        },
      });
      cards += 1;
    }
  }
  return { games: GAMES.length, cards };
}

export async function seedShippingRates(prisma: PrismaClient): Promise<number> {
  for (const rate of SHIPPING_RATE_SEED) {
    await prisma.shippingRate.upsert({
      where: {
        originZone_destZone_method: {
          originZone: rate.originZone,
          destZone: rate.destZone,
          method: rate.method,
        },
      },
      update: { priceClp: rate.priceClp },
      create: {
        originZone: rate.originZone,
        destZone: rate.destZone,
        method: rate.method,
        priceClp: rate.priceClp,
      },
    });
  }
  return SHIPPING_RATE_SEED.length;
}
