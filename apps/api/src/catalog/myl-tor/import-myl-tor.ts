import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { uniqueSlug } from "../slug";
import { delay, fetchTorEdition } from "./client";
import { completenessFromMapped, type MylTorCompletenessReport } from "./completeness";
import { MYL_TOR_FORMATS, editionsForFormats, findTorEdition, type MylTorFormat } from "./editions";
import {
  cardAttributeSource,
  isTorOwnedSource,
  mapTorEditionCards,
  MYL_TOR_SOURCE,
  type MappedMylTorCard,
} from "./map-card";

const GAME_SLUG = "mitos-y-leyendas";

export type MylTorImportOptions = {
  formats?: MylTorFormat[];
  editionSlug?: string;
  dryRun?: boolean;
  force?: boolean;
  card?: string;
  missingOnly?: boolean;
  fetchImpl?: typeof fetch;
  now?: string;
  delayMs?: number;
};

export type MylTorImportSummary = {
  editions: number;
  cards: number;
  imported: number;
  updated: number;
  skipped: number;
  conflicts: number;
  completeness: MylTorCompletenessReport;
};

function matchesCardFilter(card: MappedMylTorCard, needle: string | undefined): boolean {
  if (!needle) return true;
  const n = needle.trim().toLocaleLowerCase("es-CL");
  return card.slug.toLocaleLowerCase("es-CL") === n || card.name.toLocaleLowerCase("es-CL").includes(n);
}

function needsEnrichment(
  existing: { imageUrl: string | null; attributes: Prisma.JsonValue } | null,
): boolean {
  if (!existing) return true;
  if (!existing.imageUrl) return true;
  const attrs =
    existing.attributes && typeof existing.attributes === "object" && !Array.isArray(existing.attributes)
      ? (existing.attributes as Record<string, unknown>)
      : {};
  return typeof attrs.rulesText !== "string";
}

async function upsertGame(prisma: PrismaClient, dryRun: boolean) {
  if (dryRun) {
    return prisma.tcgGame.findUnique({ where: { slug: GAME_SLUG } });
  }
  return prisma.tcgGame.upsert({
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
}

async function resolveSet(
  prisma: PrismaClient,
  gameId: string,
  mapped: MappedMylTorCard["set"],
  cardCount: number,
  dryRun: boolean,
): Promise<string | null> {
  const existing =
    (await prisma.tcgSet.findFirst({ where: { gameId, slug: mapped.slug } })) ??
    (await prisma.tcgSet.findFirst({ where: { gameId, code: mapped.code } }));
  if (existing) {
    if (!dryRun) {
      await prisma.tcgSet.update({
        where: { id: existing.id },
        data: {
          name: mapped.name,
          printedTotal: cardCount,
          total: cardCount,
          ...(mapped.imageUrl ? { imageUrl: mapped.imageUrl } : {}),
        },
      });
    }
    return existing.id;
  }
  if (dryRun) return null;
  const created = await prisma.tcgSet.create({
    data: {
      gameId,
      code: mapped.code,
      slug: mapped.slug,
      name: mapped.name,
      printedTotal: cardCount,
      total: cardCount,
      imageUrl: mapped.imageUrl,
    },
  });
  return created.id;
}

async function findExistingCard(
  prisma: PrismaClient,
  setId: string,
  card: MappedMylTorCard,
) {
  return (
    (await prisma.card.findUnique({ where: { setId_slug: { setId, slug: card.slug } } })) ??
    (await prisma.card.findUnique({
      where: { setId_number_name: { setId, number: card.number, name: card.name } },
    }))
  );
}

export async function importMylTorCatalog(
  prisma: PrismaClient,
  options: MylTorImportOptions = {},
): Promise<MylTorImportSummary> {
  const dryRun = options.dryRun === true;
  const force = options.force === true;
  const formats = options.formats?.length ? options.formats : [...MYL_TOR_FORMATS];
  const retrievedAt = options.now ?? new Date().toISOString();
  const fetchImpl = options.fetchImpl ?? fetch;

  const refs = options.editionSlug
    ? [findTorEdition(options.editionSlug)].filter((row): row is NonNullable<typeof row> => Boolean(row))
    : editionsForFormats(formats);
  if (options.editionSlug && refs.length === 0) {
    const guessedFormat = formats[0] ?? "pb";
    refs.push({ slug: options.editionSlug, label: options.editionSlug, format: guessedFormat });
  }

  const game = await upsertGame(prisma, dryRun);
  const empty: MylTorImportSummary = {
    editions: 0,
    cards: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    conflicts: 0,
    completeness: { cards: 0, complete: 0, incomplete: 0, issues: [] },
  };
  if (!game) return empty;

  const allMapped: MappedMylTorCard[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let conflicts = 0;
  let editions = 0;

  for (const ref of refs) {
    const payload = await fetchTorEdition(ref.slug, fetchImpl);
    const mapped = mapTorEditionCards(payload, {
      requestSlug: ref.slug,
      format: ref.format,
      retrievedAt,
    }).filter((card) => matchesCardFilter(card, options.card));
    if (mapped.length === 0) {
      skipped += 1;
      await delay(options.delayMs ?? 80);
      continue;
    }
    editions += 1;
    allMapped.push(...mapped);
    const setId = await resolveSet(prisma, game.id, mapped[0]!.set, mapped.length, dryRun);
    if (!setId) {
      skipped += mapped.length;
      await delay(options.delayMs ?? 80);
      continue;
    }
    const taken = new Set(
      (await prisma.card.findMany({ where: { setId }, select: { slug: true } })).map((row) => row.slug),
    );

    for (const card of mapped) {
      const existing = await findExistingCard(prisma, setId, card);
      if (options.missingOnly && existing && !needsEnrichment(existing)) {
        skipped += 1;
        continue;
      }
      const source = existing ? cardAttributeSource(existing.attributes) : null;
      if (existing && !isTorOwnedSource(source) && !force) {
        conflicts += 1;
        continue;
      }
      if (dryRun) {
        if (existing) updated += 1;
        else imported += 1;
        continue;
      }
      const slug = existing?.slug ?? uniqueSlug(card.slug, taken);
      const data = {
        rarity: card.rarity,
        supertype: card.supertype,
        imageUrl: card.imageUrl,
        attributes: card.attributes as Prisma.InputJsonValue,
      };
      let row: { id: string };
      try {
        row = existing
          ? await prisma.card.update({
              where: { id: existing.id },
              data: { ...data, name: card.name, number: card.number, slug },
            })
          : await prisma.card.create({
              data: {
                setId,
                number: card.number,
                slug,
                name: card.name,
                ...data,
              },
            });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          conflicts += 1;
          continue;
        }
        throw error;
      }
      await prisma.cardVariant.upsert({
        where: {
          cardId_language_finish_finishDetail: {
            cardId: row.id,
            language: "ES",
            finish: "NORMAL",
            finishDetail: "",
          },
        },
        update: {
          isDefault: true,
          externalIds: { torPath: String(card.attributes.sourceId) } as Prisma.InputJsonValue,
        },
        create: {
          cardId: row.id,
          language: "ES",
          finish: "NORMAL",
          isDefault: true,
          externalIds: { torPath: String(card.attributes.sourceId) } as Prisma.InputJsonValue,
        },
      });
      if (existing) updated += 1;
      else imported += 1;
    }
    await delay(options.delayMs ?? 80);
  }

  if (!dryRun && imported + updated > 0) {
    await prisma.auditLog.create({
      data: {
        action: "catalog.imported",
        entityType: "TcgGame",
        entityId: game.id,
        metadata: { source: MYL_TOR_SOURCE, imported, updated, conflicts, editions },
      },
    });
  }

  return {
    editions,
    cards: imported + updated,
    imported,
    updated,
    skipped,
    conflicts,
    completeness: completenessFromMapped(allMapped),
  };
}

export function formatMylTorImportSummary(summary: MylTorImportSummary): string {
  return [
    `Editions: ${summary.editions}`,
    `Imported: ${summary.imported}`,
    `Updated: ${summary.updated}`,
    `Skipped: ${summary.skipped}`,
    `Conflicts: ${summary.conflicts}`,
    `Completeness: ${summary.completeness.complete}/${summary.completeness.cards}`,
  ].join("\n");
}
