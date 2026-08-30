import type { CardFinish, CardLanguage } from "@tcg/config";
import { slugifyStable } from "../slug";

export type ScryfallCard = {
  id: string;
  name: string;
  lang: string;
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
  cmc?: number;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  keywords?: string[];
  legalities?: Record<string, string>;
  foil: boolean;
  nonfoil: boolean;
  finishes?: string[];
  image_uris?: { small?: string; normal?: string };
  card_faces?: Array<{ image_uris?: { normal?: string } }>;
};

const LANG: Record<string, CardLanguage> = {
  en: "EN",
  es: "ES",
  ja: "JA",
  ko: "KO",
  zhs: "ZH",
  zht: "ZH",
  pt: "PT",
  fr: "FR",
  de: "DE",
  it: "IT",
};

export function mapScryfallLanguage(lang: string): CardLanguage {
  return LANG[lang] ?? "EN";
}

export function mapScryfallFinishes(card: ScryfallCard): CardFinish[] {
  const finishes = new Set<CardFinish>();
  if (card.finishes?.length) {
    for (const finish of card.finishes) {
      if (finish === "nonfoil") finishes.add("NORMAL");
      else if (finish === "foil") finishes.add("FOIL");
      else if (finish === "etched") finishes.add("ETCHED");
      else finishes.add("OTHER");
    }
  } else {
    if (card.nonfoil) finishes.add("NORMAL");
    if (card.foil) finishes.add("FOIL");
  }
  if (finishes.size === 0) {
    finishes.add("NORMAL");
  }
  return [...finishes];
}

export function scryfallImageUrl(card: ScryfallCard): string | null {
  return card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null;
}

export function mapScryfallCard(card: ScryfallCard): {
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
    externalIds: { scryfallId: string };
  }>;
} {
  const finishes = mapScryfallFinishes(card);
  const language = mapScryfallLanguage(card.lang);
  const variants = finishes.map((finish, index) => ({
    language,
    finish,
    isDefault: language === "EN" && finish === "NORMAL" ? true : index === 0 && !finishes.includes("NORMAL"),
    externalIds: { scryfallId: card.id },
  }));
  if (!variants.some((row) => row.isDefault) && variants[0]) {
    variants[0].isDefault = true;
  }

  const typeLine = card.type_line ?? "";
  const [typeSide, subtypeSide] = typeLine.split("—").map((part) => part.trim());
  const types = (typeSide ?? "").split(/\s+/).filter(Boolean);
  const cardType = types.find((type) => !["Legendary", "Basic", "Snow", "World", "Ongoing"].includes(type)) ?? types[0] ?? "Unknown";
  const subtypes = subtypeSide ? subtypeSide.split(/\s+/).filter(Boolean) : [];
  const legalities = Object.entries(card.legalities ?? {})
    .filter(([, status]) => status === "legal")
    .map(([format]) => format);

  return {
    number: card.collector_number,
    slug: slugifyStable(card.name, "card"),
    name: card.name,
    rarity: card.rarity,
    supertype: typeSide || "Unknown",
    imageUrl: scryfallImageUrl(card),
    attributes: {
      source: "scryfall",
      manaCost: card.mana_cost ?? null,
      manaValue: card.cmc ?? null,
      cmc: card.cmc ?? null,
      colors: card.colors ?? [],
      colorIdentity: card.color_identity ?? card.colors ?? [],
      cardType,
      subtypes,
      power: card.power ?? null,
      toughness: card.toughness ?? null,
      keywords: card.keywords ?? [],
      legalities,
      oracleText: card.oracle_text ?? null,
      typeLine: typeLine || null,
    },
    variants,
  };
}
