import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { uniqueSlug } from "../slug";
import { mapPokemonTcgCard, type PokemonTcgCard } from "./pokemon-tcg.mapper";

const USER_AGENT = "tcg-platform/0.1 (catalog-import; educational)";
const API_BASE = "https://api.pokemontcg.io/v2";

type PokemonTcgSet = {
  id: string;
  name: string;
  series?: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string;
  images?: { symbol?: string };
};

type PokemonTcgList = {
  data: PokemonTcgCard[];
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
};

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": USER_AGENT };
  const key = process.env.POKEMON_TCG_API_KEY?.trim();
  if (key) headers["X-Api-Key"] = key;
  return headers;
}

async function pokemonTcgGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) {
    throw new Error(`Pokémon TCG API ${res.status} ${url}`);
  }
  return (await res.json()) as T;
}

export async function fetchPokemonTcgCard(id: string): Promise<PokemonTcgCard> {
  const body = await pokemonTcgGet<{ data: PokemonTcgCard }>(`${API_BASE}/cards/${encodeURIComponent(id)}`);
  return body.data;
}

export async function importPokemonTcgSet(prisma: PrismaClient, setId: string): Promise<{ cards: number }> {
  const remoteSet = await pokemonTcgGet<{ data: PokemonTcgSet }>(`${API_BASE}/sets/${encodeURIComponent(setId)}`);
  const setData = remoteSet.data;
  const game = await prisma.tcgGame.upsert({
    where: { slug: "pokemon" },
    update: { name: "Pokémon", publisher: "The Pokémon Company", isActive: true },
    create: {
      slug: "pokemon",
      name: "Pokémon",
      publisher: "The Pokémon Company",
      sortOrder: 1,
    },
  });

  const code = setData.id.toUpperCase();
  const slug = setData.id.toLowerCase();
  const set = await prisma.tcgSet.upsert({
    where: { gameId_code: { gameId: game.id, code } },
    update: {
      name: setData.name,
      slug,
      releasedAt: setData.releaseDate ? new Date(setData.releaseDate) : null,
      printedTotal: setData.printedTotal ?? null,
      total: setData.total ?? null,
      imageUrl: setData.images?.symbol ?? null,
    },
    create: {
      gameId: game.id,
      code,
      slug,
      name: setData.name,
      releasedAt: setData.releaseDate ? new Date(setData.releaseDate) : null,
      printedTotal: setData.printedTotal ?? null,
      total: setData.total ?? null,
      imageUrl: setData.images?.symbol ?? null,
    },
  });

  const taken = new Set<string>();
  const existing = await prisma.card.findMany({ where: { setId: set.id }, select: { slug: true } });
  for (const row of existing) taken.add(row.slug);

  let page = 1;
  let imported = 0;
  let totalCount = Number.POSITIVE_INFINITY;

  while ((page - 1) * 250 < totalCount) {
    const query = encodeURIComponent(`set.id:${setData.id}`);
    const list = await pokemonTcgGet<PokemonTcgList>(`${API_BASE}/cards?q=${query}&page=${page}&pageSize=250`);
    totalCount = list.totalCount ?? list.data.length;
    for (const remote of list.data) {
      const mapped = mapPokemonTcgCard(remote);
      const existingCard = await prisma.card.findUnique({
        where: { setId_number_name: { setId: set.id, number: mapped.number, name: mapped.name } },
      });
      const slugForCard = existingCard?.slug ?? uniqueSlug(mapped.slug, taken);
      const card = await prisma.card.upsert({
        where: { setId_number_name: { setId: set.id, number: mapped.number, name: mapped.name } },
        update: {
          slug: slugForCard,
          rarity: mapped.rarity,
          supertype: mapped.supertype,
          imageUrl: mapped.imageUrl,
          attributes: mapped.attributes as Prisma.InputJsonValue,
        },
        create: {
          setId: set.id,
          number: mapped.number,
          slug: slugForCard,
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
    if (!list.data.length) break;
    page += 1;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  await prisma.auditLog.create({
    data: {
      action: "catalog.imported",
      entityType: "TcgSet",
      entityId: set.id,
      metadata: { source: "pokemon-tcg-api", setId: setData.id, cards: imported },
    },
  });

  return { cards: imported };
}
