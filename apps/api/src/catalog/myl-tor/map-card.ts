import { slugifyStable } from "../slug";
import type { MylTorFormat } from "./editions";

export const MYL_TOR_SOURCE = "tor.myl.cl";
export const MYL_TOR_OWNED_SOURCES = ["tor.myl.cl", "myl-demo-pack"] as const;
export const FENIX_CARD_IMAGE_BASE = "https://api.myl.cl/static/cards";
export const TOR_CARD_PAGE_BASE = "https://tor.myl.cl/carta";

const SMALL_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "da", "do", "di"]);

const TYPE_BY_SLUG: Record<string, { code: string; label: string }> = {
  aliado: { code: "ALIADO", label: "Aliado" },
  talisman: { code: "TALISMAN", label: "Talismán" },
  totem: { code: "TOTEM", label: "Tótem" },
  arma: { code: "ARMA", label: "Arma" },
  oro: { code: "ORO", label: "Oro" },
  monumento: { code: "MONUMENTO", label: "Monumento" },
};

export type TorLookupRow = {
  id: string;
  slug?: string;
  name: string;
  flag?: string;
  title?: string;
};

export type TorEditionMeta = {
  id: string;
  slug: string;
  title: string;
  image?: string;
};

export type TorEditionCard = {
  id: string;
  edid: string;
  slug: string;
  name: string;
  rarity: string;
  race: string;
  type: string;
  keywords: string;
  cost: string;
  damage: string;
  ability: string;
  flavour: string;
};

export type TorEditionPayload = {
  status: string;
  edition?: TorEditionMeta;
  races?: TorLookupRow[];
  types?: TorLookupRow[];
  rarities?: TorLookupRow[];
  keywords?: TorLookupRow[];
  cards?: TorEditionCard[];
};

export type MappedMylTorCard = {
  set: { code: string; slug: string; name: string; imageUrl: string | null };
  number: string;
  slug: string;
  name: string;
  rarity: string;
  supertype: string;
  imageUrl: string | null;
  attributes: Record<string, unknown>;
  missing: string[];
};

export function titleCaseEs(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("es-CL");
      if (index > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("es-CL") + lower.slice(1);
    })
    .join(" ");
}

export function catalogCodeFromLabel(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80) || "MYL"
  );
}

function lookupName(rows: TorLookupRow[] | undefined, id: string): TorLookupRow | undefined {
  return rows?.find((row) => row.id === id);
}

function razaCode(row: TorLookupRow | undefined): string | undefined {
  if (!row) return undefined;
  const slug = (row.slug ?? "").toLowerCase();
  if (!slug || slug === "noraza") return undefined;
  const fromName = catalogCodeFromLabel(row.name);
  if (fromName === "SIN_RAZA") return undefined;
  return fromName;
}

function decodeKeywords(raw: string, catalog: TorLookupRow[] | undefined): string[] {
  const flags = Number.parseInt(raw, 10);
  if (!Number.isFinite(flags) || flags === 0 || !catalog?.length) return [];
  const titles: string[] = [];
  for (const row of catalog) {
    const flag = Number.parseInt(row.flag ?? "0", 10);
    if (!Number.isFinite(flag) || flag === 0) continue;
    if ((flags & flag) === flag) {
      const title = (row.title ?? row.name).trim();
      if (title) titles.push(title);
    }
  }
  return titles;
}

function optionalInt(raw: string): number | undefined {
  if (!raw || raw.trim() === "") return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : undefined;
}

export function eraForFormat(format: MylTorFormat): string {
  if (format === "pe") return "PRIMERA_ERA";
  if (format === "pb") return "PRIMER_BLOQUE";
  if (format === "segundo") return "SEGUNDO_BLOQUE";
  if (format === "fx") return "FX";
  if (format === "lbf") return "LEYENDAS_BLOQUE_FURIA";
  return "IMPERIO";
}

export function mapTorEditionCards(
  payload: TorEditionPayload,
  input: { requestSlug: string; format: MylTorFormat; retrievedAt: string },
): MappedMylTorCard[] {
  const edition = payload.edition;
  if (!edition || payload.status !== "OK" || !payload.cards) return [];
  const setSlug = slugifyStable(edition.slug || input.requestSlug, "edicion");
  const setName = edition.title?.trim() || input.requestSlug;
  const setCode = `TOR${edition.id}`;
  const setImage = edition.image && edition.image.startsWith("https://") ? edition.image : null;
  const era = eraForFormat(input.format);
  const edicion = catalogCodeFromLabel(setName);

  return payload.cards.map((card) => {
    const typeRow = lookupName(payload.types, card.type);
    const typeMeta = TYPE_BY_SLUG[(typeRow?.slug ?? "").toLowerCase()] ?? {
      code: catalogCodeFromLabel(typeRow?.name ?? "ALIADO"),
      label: typeRow?.name || "Aliado",
    };
    const rarity = lookupName(payload.rarities, card.rarity)?.name?.trim() || "Real";
    const race = razaCode(lookupName(payload.races, card.race));
    const keywords = decodeKeywords(card.keywords, payload.keywords);
    const rulesText = (card.ability ?? "").trim();
    const flavorText = (card.flavour ?? "").trim();
    const collector = (card.edid || "").trim();
    const number = collector || (card.id || "000").trim();
    const slug = slugifyStable(card.slug || card.name, "carta");
    const name = titleCaseEs(card.name || card.slug || "Carta");
    const imageUrl =
      edition.id && collector ? `${FENIX_CARD_IMAGE_BASE}/${edition.id}/${collector}.png` : null;
    const sourceUrl = `${TOR_CARD_PAGE_BASE}/${edition.slug || input.requestSlug}/${card.slug || slug}`;
    const coste = optionalInt(card.cost);
    const fuerza = typeMeta.code === "ALIADO" ? optionalInt(card.damage) : undefined;
    const missing: string[] = [];
    if (!imageUrl) missing.push("image");
    if (!sourceUrl) missing.push("sourceUrl");
    const attributes: Record<string, unknown> = {
      source: MYL_TOR_SOURCE,
      sourceQuality: "VERIFIED_PROVIDER",
      sourceUrl,
      sourceId: `${edition.slug || input.requestSlug}/${card.slug || slug}`,
      sourceRetrievedAt: input.retrievedAt,
      verified: missing.length === 0,
      cardType: typeMeta.code,
      edicion,
      era,
      bloque: era,
      collectorNumber: number,
      rulesText,
      flavorText: flavorText || null,
      flavorTextStatus: flavorText ? "OFFICIAL" : "NO_OFFICIAL_FLAVOR_TEXT",
      ...(race ? { raza: race } : {}),
      ...(coste != null ? { coste } : {}),
      ...(fuerza != null ? { fuerza } : {}),
      ...(keywords.length > 0 ? { keywords } : {}),
    };
    return {
      set: { code: setCode, slug: setSlug, name: setName, imageUrl: setImage },
      number,
      slug,
      name,
      rarity,
      supertype: typeMeta.label,
      imageUrl,
      attributes,
      missing,
    };
  });
}

export function cardAttributeSource(attributes: unknown): string | null {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return null;
  const source = (attributes as { source?: unknown }).source;
  return typeof source === "string" && source.length > 0 ? source : null;
}

export function isTorOwnedSource(source: string | null | undefined): boolean {
  if (!source) return false;
  return (MYL_TOR_OWNED_SOURCES as readonly string[]).includes(source);
}
