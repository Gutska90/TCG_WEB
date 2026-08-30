import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { uniqueSlug } from "../slug";
import { mapScryfallCard, type ScryfallCard } from "./scryfall.mapper";

const USER_AGENT = "tcg-platform/0.1 (catalog-import; educational)";

type ScryfallSet = {
  code: string;
  name: string;
  released_at?: string;
  printed_total?: number;
  card_count?: number;
  icon_svg_uri?: string;
};

type ScryfallList = {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
};

async function scryfallGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Scryfall ${res.status} ${url}`);
  }
  return (await res.json()) as T;
}

export async function fetchScryfallCard(setCode: string, collectorNumber: string): Promise<ScryfallCard> {
  return scryfallGet<ScryfallCard>(
    `https://api.scryfall.com/cards/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(collectorNumber)}`,
  );
}

export async function fetchScryfallCardNamed(name: string): Promise<ScryfallCard> {
  return scryfallGet<ScryfallCard>(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
  );
}

export async function importScryfallSet(prisma: PrismaClient, setCode: string): Promise<{ cards: number }> {
  const code = setCode.toLowerCase();
  const remoteSet = await scryfallGet<ScryfallSet>(`https://api.scryfall.com/sets/${code}`);
  const game = await prisma.tcgGame.upsert({
    where: { slug: "magic" },
    update: { name: "Magic: The Gathering", publisher: "Wizards of the Coast", isActive: true },
    create: {
      slug: "magic",
      name: "Magic: The Gathering",
      publisher: "Wizards of the Coast",
      sortOrder: 2,
    },
  });

  const set = await prisma.tcgSet.upsert({
    where: { gameId_code: { gameId: game.id, code: remoteSet.code.toUpperCase() } },
    update: {
      name: remoteSet.name,
      slug: code,
      releasedAt: remoteSet.released_at ? new Date(remoteSet.released_at) : null,
      printedTotal: remoteSet.printed_total ?? null,
      total: remoteSet.card_count ?? null,
      imageUrl: remoteSet.icon_svg_uri ?? null,
    },
    create: {
      gameId: game.id,
      code: remoteSet.code.toUpperCase(),
      slug: code,
      name: remoteSet.name,
      releasedAt: remoteSet.released_at ? new Date(remoteSet.released_at) : null,
      printedTotal: remoteSet.printed_total ?? null,
      total: remoteSet.card_count ?? null,
      imageUrl: remoteSet.icon_svg_uri ?? null,
    },
  });

  const taken = new Set<string>();
  const existing = await prisma.card.findMany({ where: { setId: set.id }, select: { slug: true } });
  for (const row of existing) taken.add(row.slug);

  let url: string | undefined =
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`e:${code}`)}&unique=prints`;
  let imported = 0;

  while (url) {
    const page: ScryfallList = await scryfallGet<ScryfallList>(url);
    for (const remote of page.data) {
      const mapped = mapScryfallCard(remote);
      const existingCard = await prisma.card.findUnique({
        where: { setId_number_name: { setId: set.id, number: mapped.number, name: mapped.name } },
      });
      const slug = existingCard?.slug ?? uniqueSlug(mapped.slug, taken);
      const card = await prisma.card.upsert({
        where: {
          setId_number_name: { setId: set.id, number: mapped.number, name: mapped.name },
        },
        update: {
          slug,
          rarity: mapped.rarity,
          supertype: mapped.supertype,
          imageUrl: mapped.imageUrl,
          attributes: mapped.attributes as Prisma.InputJsonValue,
        },
        create: {
          setId: set.id,
          number: mapped.number,
          slug,
          name: mapped.name,
          rarity: mapped.rarity,
          supertype: mapped.supertype,
          imageUrl: mapped.imageUrl,
          attributes: mapped.attributes as Prisma.InputJsonValue,
        },
      });
      for (const variant of mapped.variants) {
        await prisma.cardVariant.upsert({
          where: {
            cardId_language_finish_finishDetail: {
              cardId: card.id,
              language: variant.language,
              finish: variant.finish,
              finishDetail: "",
            },
          },
          update: {
            isDefault: variant.isDefault,
            externalIds: variant.externalIds as Prisma.InputJsonValue,
          },
          create: {
            cardId: card.id,
            language: variant.language,
            finish: variant.finish,
            isDefault: variant.isDefault,
            externalIds: variant.externalIds as Prisma.InputJsonValue,
          },
        });
      }
      imported += 1;
    }
    url = page.has_more ? page.next_page : undefined;
    if (url) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "catalog.imported",
      entityType: "TcgSet",
      entityId: set.id,
      metadata: { source: "scryfall", setCode: code, cards: imported },
    },
  });

  return { cards: imported };
}
