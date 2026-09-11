import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { slugifyStable, uniqueSlug } from "../slug";
import { MYL_DEMO_CARDS, type MylDemoCard } from "./cards";

const GAME_SLUG = "mitos-y-leyendas";
const NOW = "2026-09-10T00:00:00.000Z";
export const MYL_DEMO_SOURCE = "myl-demo-pack";

export type MylImportSummary = {
  sets: number;
  cards: number;
  imported: number;
  updated: number;
  skipped: number;
  conflicts: number;
};

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

export function cardAttributeSource(attributes: Prisma.JsonValue): string | null {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return null;
  const source = (attributes as { source?: unknown }).source;
  return typeof source === "string" && source.length > 0 ? source : null;
}

/** Demo importer may update only rows it previously wrote, unless `--force`. */
export function isMylDemoPackCard(attributes: Prisma.JsonValue): boolean {
  return cardAttributeSource(attributes) === MYL_DEMO_SOURCE;
}

export function toMylDemoAttributes(card: MylDemoCard): Record<string, unknown> {
  const sourceId = `${card.set.slug}/${slugifyStable(card.name, "carta")}`;
  return {
    source: MYL_DEMO_SOURCE,
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
  options: { dryRun?: boolean; force?: boolean } = {},
): Promise<MylImportSummary> {
  const dryRun = options.dryRun === true;
  const force = options.force === true;
  const game = dryRun
    ? await prisma.tcgGame.findUnique({ where: { slug: GAME_SLUG } })
    : await prisma.tcgGame.upsert({
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
  if (!game) {
    return { sets: 0, cards: 0, imported: 0, updated: 0, skipped: cards.length, conflicts: 0 };
  }

  const setIds = new Map<string, string>();
  const takenBySet = new Map<string, Set<string>>();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const row of cards) {
    const number = row.number?.trim() || row.name;
    let setId = setIds.get(row.set.code);
    if (!setId) {
      const existingSet =
        (await prisma.tcgSet.findFirst({ where: { gameId: game.id, slug: row.set.slug } })) ??
        (await prisma.tcgSet.findFirst({ where: { gameId: game.id, code: row.set.code } }));
      if (existingSet) {
        if (!dryRun) {
          await prisma.tcgSet.update({ where: { id: existingSet.id }, data: { name: row.set.name } });
        }
        setId = existingSet.id;
      } else if (dryRun) {
        skipped += 1;
        continue;
      } else {
        const set = await prisma.tcgSet.create({
          data: {
            gameId: game.id,
            code: row.set.code,
            slug: row.set.slug,
            name: row.set.name,
          },
        });
        setId = set.id;
      }
      setIds.set(row.set.code, setId);
      const existing = await prisma.card.findMany({ where: { setId }, select: { slug: true } });
      takenBySet.set(setId, new Set(existing.map((card) => card.slug)));
    }

    const taken = takenBySet.get(setId) ?? new Set<string>();
    const existingCard = await prisma.card.findUnique({
      where: { setId_number_name: { setId, number, name: row.name } },
    });
    if (existingCard && !isMylDemoPackCard(existingCard.attributes) && !force) {
      conflicts += 1;
      continue;
    }
    if (dryRun) {
      if (existingCard) updated += 1;
      else imported += 1;
      continue;
    }
    const slug = existingCard?.slug ?? uniqueSlug(slugifyStable(row.name, "carta"), taken);
    const attributes = toMylDemoAttributes(row);
    const imageUrl =
      row.imageUrl && row.imageUrl.startsWith("https://") ? row.imageUrl : (existingCard?.imageUrl ?? null);
    const card = await prisma.card.upsert({
      where: { setId_number_name: { setId, number, name: row.name } },
      update: {
        rarity: row.rarity,
        supertype: cardTypeToSupertype(row.cardType),
        attributes: attributes as Prisma.InputJsonValue,
        ...(imageUrl ? { imageUrl } : {}),
      },
      create: {
        setId,
        number,
        slug,
        name: row.name,
        rarity: row.rarity,
        supertype: cardTypeToSupertype(row.cardType),
        imageUrl,
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
    if (existingCard) updated += 1;
    else imported += 1;
  }

  return {
    sets: setIds.size,
    cards: imported + updated,
    imported,
    updated,
    skipped,
    conflicts,
  };
}

export function formatMylImportSummary(summary: MylImportSummary): string {
  return `Imported: ${summary.imported}\nUpdated: ${summary.updated}\nSkipped: ${summary.skipped}\nConflicts: ${summary.conflicts}`;
}
