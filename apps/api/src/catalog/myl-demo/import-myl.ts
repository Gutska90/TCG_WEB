import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { slugifyStable, uniqueSlug } from "../slug";
import { MYL_DEMO_CARDS, type MylDemoCard } from "./cards";

const GAME_SLUG = "mitos-y-leyendas";
const NOW = "2026-09-10T00:00:00.000Z";

function cardTypeToSupertype(cardType: MylDemoCard["cardType"]): string {
  switch (cardType) {
    case "ALIADO":
      return "Aliado";
    case "TALISMAN":
      return "Talismán";
    case "TOTEM":
      return "Tótem";
    case "ARMA":
      return "Arma";
    case "ORO":
      return "Oro";
  }
}

export function toMylDemoAttributes(card: MylDemoCard): Record<string, unknown> {
  const sourceId = `${card.set.slug}/${slugifyStable(card.name, "carta")}`;
  return {
    source: "myl-demo-pack",
    sourceQuality: "CURATED_VERIFIED",
    sourceUrl: "https://tor.myl.cl/",
    sourceId,
    sourceRetrievedAt: NOW,
    verified: false,
    cardType: card.cardType,
    edicion: card.set.edicion,
    era: card.set.era,
    ...(card.raza ? { raza: card.raza } : {}),
    ...(card.coste != null ? { coste: card.coste } : {}),
    ...(card.fuerza != null ? { fuerza: card.fuerza } : {}),
  };
}

export async function importMylDemoCards(
  prisma: PrismaClient,
  cards: MylDemoCard[] = MYL_DEMO_CARDS,
): Promise<{ sets: number; cards: number }> {
  const game = await prisma.tcgGame.upsert({
    where: { slug: GAME_SLUG },
    update: { name: "Mitos y Leyendas", publisher: "Fénix", isActive: true },
    create: {
      slug: GAME_SLUG,
      name: "Mitos y Leyendas",
      publisher: "Fénix",
      sortOrder: 5,
      isActive: true,
    },
  });

  const setIds = new Map<string, string>();
  const takenBySet = new Map<string, Set<string>>();
  let imported = 0;

  for (const row of cards) {
    let setId = setIds.get(row.set.code);
    if (!setId) {
      const existingSet =
        (await prisma.tcgSet.findFirst({ where: { gameId: game.id, slug: row.set.slug } })) ??
        (await prisma.tcgSet.findFirst({ where: { gameId: game.id, code: row.set.code } }));
      const set = existingSet
        ? await prisma.tcgSet.update({
            where: { id: existingSet.id },
            data: { name: row.set.name },
          })
        : await prisma.tcgSet.create({
            data: {
              gameId: game.id,
              code: row.set.code,
              slug: row.set.slug,
              name: row.set.name,
            },
          });
      setId = set.id;
      setIds.set(row.set.code, setId);
      const existing = await prisma.card.findMany({ where: { setId }, select: { slug: true } });
      takenBySet.set(setId, new Set(existing.map((card) => card.slug)));
    }

    const taken = takenBySet.get(setId) ?? new Set<string>();
    const existingCard = await prisma.card.findUnique({
      where: { setId_number_name: { setId, number: row.name, name: row.name } },
    });
    const slug = existingCard?.slug ?? uniqueSlug(slugifyStable(row.name, "carta"), taken);
    const attributes = toMylDemoAttributes(row);
    const card = await prisma.card.upsert({
      where: { setId_number_name: { setId, number: row.name, name: row.name } },
      update: {
        rarity: row.rarity,
        supertype: cardTypeToSupertype(row.cardType),
        attributes: attributes as Prisma.InputJsonValue,
      },
      create: {
        setId,
        number: row.name,
        slug,
        name: row.name,
        rarity: row.rarity,
        supertype: cardTypeToSupertype(row.cardType),
        imageUrl: null,
        attributes: attributes as Prisma.InputJsonValue,
      },
    });
    await prisma.cardVariant.upsert({
      where: {
        cardId_language_finish_finishDetail: {
          cardId: card.id,
          language: "ES",
          finish: "NORMAL",
          finishDetail: "",
        },
      },
      update: { isDefault: true },
      create: {
        cardId: card.id,
        language: "ES",
        finish: "NORMAL",
        isDefault: true,
        externalIds: { mylDemoPack: slug } as Prisma.InputJsonValue,
      },
    });
    imported += 1;
  }

  return { sets: setIds.size, cards: imported };
}
