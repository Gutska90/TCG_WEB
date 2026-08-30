import { normalizeCatalogCode } from "@tcg/config";
import type { CardFinish, CardLanguage } from "@tcg/config";
import { slugifyStable } from "../slug";

export type PokemonTcgAttack = {
  name?: string;
  cost?: string[];
  convertedEnergyCost?: number;
};

export type PokemonTcgTypedValue = { type?: string; value?: string };

export type PokemonTcgCard = {
  id: string;
  name: string;
  supertype?: string;
  subtypes?: string[];
  hp?: string | number;
  types?: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  weaknesses?: PokemonTcgTypedValue[];
  resistances?: PokemonTcgTypedValue[];
  attacks?: PokemonTcgAttack[];
  artist?: string;
  rarity?: string;
  number?: string;
  regulationMark?: string;
  legalities?: Record<string, string>;
  images?: { small?: string; large?: string };
  set?: { id?: string; name?: string; series?: string };
};

function cardTypeFromSupertype(supertype: string | undefined): string {
  const value = (supertype ?? "").toLowerCase();
  if (value.includes("trainer")) return "TRAINER";
  if (value.includes("energy")) return "ENERGY";
  return "POKEMON";
}

function intOrNull(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function codes(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => normalizeCatalogCode(value)).filter(Boolean);
}

function typedList(values: PokemonTcgTypedValue[] | undefined): Array<{ type: string; value: string }> {
  return (values ?? [])
    .filter((row) => row.type)
    .map((row) => ({ type: normalizeCatalogCode(row.type ?? ""), value: row.value ?? "" }));
}

export function mapPokemonTcgCard(
  card: PokemonTcgCard,
  retrievedAt = new Date().toISOString(),
): {
  number: string;
  slug: string;
  name: string;
  rarity: string;
  supertype: string;
  imageUrl: string | null;
  attributes: Record<string, unknown>;
  variants: Array<{
    language: CardLanguage;
    finish: CardFinish;
    isDefault: boolean;
    externalIds: { pokemonTcgApiId: string };
  }>;
} {
  const pokemonTypes = codes(card.types);
  const subtypes = codes(card.subtypes);
  const weaknesses = typedList(card.weaknesses);
  const resistances = typedList(card.resistances);
  const attackCosts = (card.attacks ?? [])
    .map((attack) => codes(attack.cost))
    .filter((cost) => cost.length > 0);
  const maxAttackEnergyCost = (card.attacks ?? []).reduce<number | null>((max, attack) => {
    const cost = attack.convertedEnergyCost;
    if (cost == null || !Number.isFinite(cost)) return max;
    return max == null ? cost : Math.max(max, cost);
  }, null);
  const legalities = Object.entries(card.legalities ?? {})
    .filter(([, status]) => String(status).toLowerCase() === "legal")
    .map(([format]) => format);
  const cardType = cardTypeFromSupertype(card.supertype);
  const attributes: Record<string, unknown> = {
    source: "pokemon-tcg-api",
    sourceQuality: "VERIFIED_PROVIDER",
    sourceUrl: `https://api.pokemontcg.io/v2/cards/${card.id}`,
    sourceId: card.id,
    sourceRetrievedAt: retrievedAt,
    verified: true,
    cardType,
    subtypes,
    pokemonTypes,
    pokemonType: pokemonTypes,
    hp: intOrNull(card.hp),
    evolvesFrom: card.evolvesFrom ?? null,
    evolvesTo: card.evolvesTo ?? [],
    retreatCost: card.convertedRetreatCost ?? card.retreatCost?.length ?? null,
    weaknesses,
    resistances,
    weaknessTypes: weaknesses.map((row) => row.type),
    resistanceTypes: resistances.map((row) => row.type),
    attackCosts,
    maxAttackEnergyCost,
    illustrator: card.artist ?? null,
    legalities,
  };
  if (card.regulationMark) attributes.regulationMark = card.regulationMark;

  return {
    number: card.number ?? card.id,
    slug: slugifyStable(card.name, "card"),
    name: card.name,
    rarity: card.rarity ?? "",
    supertype: card.supertype ?? "Pokémon",
    imageUrl: card.images?.large ?? card.images?.small ?? null,
    attributes,
    variants: [
      {
        language: "EN",
        finish: "NORMAL",
        isDefault: true,
        externalIds: { pokemonTcgApiId: card.id },
      },
    ],
  };
}
