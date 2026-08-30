import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { slugifyStable } from "../slug";
import { loadReferenceFixtures } from "./load";
import type { ReferenceFixture } from "./types";

const GAMES: Record<string, { name: string; publisher: string; sortOrder: number }> = {
  pokemon: { name: "Pokémon", publisher: "The Pokémon Company", sortOrder: 1 },
  magic: { name: "Magic: The Gathering", publisher: "Wizards of the Coast", sortOrder: 2 },
  "one-piece": { name: "One Piece", publisher: "Bandai", sortOrder: 3 },
  yugioh: { name: "Yu-Gi-Oh!", publisher: "Konami", sortOrder: 4 },
  "mitos-y-leyendas": { name: "Mitos y Leyendas", publisher: "Fénix", sortOrder: 5 },
  digimon: { name: "Digimon Card Game", publisher: "Bandai", sortOrder: 6 },
  gundam: { name: "Gundam Card Game", publisher: "Bandai", sortOrder: 7 },
};

export async function seedReferenceCatalog(prisma: PrismaClient): Promise<{ games: number; cards: number }> {
  const fixtures = loadReferenceFixtures();
  const gameSlugs = new Set(fixtures.map((row) => row.gameSlug));
  for (const slug of gameSlugs) {
    const meta = GAMES[slug];
    if (!meta) throw new Error(`Unknown reference game ${slug}`);
    await prisma.tcgGame.upsert({
      where: { slug },
      update: { name: meta.name, publisher: meta.publisher, isActive: true },
      create: { slug, name: meta.name, publisher: meta.publisher, sortOrder: meta.sortOrder, isActive: true },
    });
  }
  let cards = 0;
  for (const fixture of fixtures) {
    await upsertFixture(prisma, fixture);
    cards += 1;
  }
  return { games: gameSlugs.size, cards };
}

async function upsertFixture(prisma: PrismaClient, fixture: ReferenceFixture): Promise<void> {
  const game = await prisma.tcgGame.findUniqueOrThrow({ where: { slug: fixture.gameSlug } });
  const set = await prisma.tcgSet.upsert({
    where: { gameId_code: { gameId: game.id, code: fixture.data.set.code } },
    update: { name: fixture.data.set.name, slug: fixture.data.set.slug },
    create: {
      gameId: game.id,
      code: fixture.data.set.code,
      slug: fixture.data.set.slug,
      name: fixture.data.set.name,
    },
  });
  const slug = slugifyStable(fixture.data.card.name, "card");
  const existing = await prisma.card.findUnique({
    where: {
      setId_number_name: { setId: set.id, number: fixture.data.card.number, name: fixture.data.card.name },
    },
  });
  const card = await prisma.card.upsert({
    where: {
      setId_number_name: { setId: set.id, number: fixture.data.card.number, name: fixture.data.card.name },
    },
    update: {
      rarity: fixture.data.card.rarity,
      supertype: fixture.data.card.supertype,
      imageUrl: fixture.data.card.imageUrl,
      attributes: fixture.data.card.attributes as Prisma.InputJsonValue,
    },
    create: {
      setId: set.id,
      number: fixture.data.card.number,
      slug: existing?.slug ?? slug,
      name: fixture.data.card.name,
      rarity: fixture.data.card.rarity,
      supertype: fixture.data.card.supertype,
      imageUrl: fixture.data.card.imageUrl,
      attributes: fixture.data.card.attributes as Prisma.InputJsonValue,
    },
  });
  await prisma.cardVariant.upsert({
    where: {
      cardId_language_finish_finishDetail: {
        cardId: card.id,
        language: fixture.data.variant.language,
        finish: fixture.data.variant.finish,
        finishDetail: "",
      },
    },
    update: {
      isDefault: true,
      externalIds: fixture.data.variant.externalIds as Prisma.InputJsonValue,
    },
    create: {
      cardId: card.id,
      language: fixture.data.variant.language,
      finish: fixture.data.variant.finish,
      isDefault: true,
      externalIds: fixture.data.variant.externalIds as Prisma.InputJsonValue,
    },
  });
}
