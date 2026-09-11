import { z } from "zod";
import { slugifyStable } from "../slug";
import { MYL_DEMO_SETS, type MylDemoCard, type MylDemoCardType, type MylDemoSet } from "./cards";

const CARD_TYPES: Record<string, MylDemoCardType> = {
  ALIADO: "ALIADO",
  TALISMAN: "TALISMAN",
  TALISMÁN: "TALISMAN",
  TOTEM: "TOTEM",
  TÓTEM: "TOTEM",
  ARMA: "ARMA",
  ORO: "ORO",
};

const httpsUrl = z.string().url().refine((value) => value.startsWith("https://"));

const externalCardSchema = z.object({
  name: z.string().trim().min(1).max(120),
  set: z.string().trim().min(1).max(120),
  number: z.string().trim().max(40).optional(),
  rarity: z.string().trim().max(80).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  attributes: z
    .object({
      cardType: z.string().trim().max(40).optional(),
      raza: z.string().trim().max(80).optional(),
      coste: z.number().int().min(0).max(99).optional(),
      fuerza: z.number().int().min(0).max(99).optional(),
      era: z.string().trim().max(80).optional(),
    })
    .passthrough()
    .optional(),
});

export type MylJsonParseResult = {
  cards: MylDemoCard[];
  skipped: Array<{ name: string; reason: string }>;
  duplicatesInFile: number;
};

function resolveSet(raw: string): MylDemoSet | null {
  const needle = slugifyStable(raw, "set");
  for (const set of Object.values(MYL_DEMO_SETS)) {
    if (set.slug === needle || slugifyStable(set.name) === needle || set.code.toLowerCase() === raw.trim().toLowerCase()) {
      return set;
    }
  }
  return {
    code: needle.replace(/-/g, "").slice(0, 8).toUpperCase() || "MYL",
    slug: needle,
    name: raw.trim(),
    edicion: needle.replace(/-/g, "_").toUpperCase(),
    era: "DEMO",
  };
}

function resolveType(raw: string | undefined): MylDemoCardType | null {
  if (!raw) return "ALIADO";
  const key = raw.trim().toUpperCase();
  return CARD_TYPES[key] ?? null;
}

export function parseMylJsonDocument(raw: unknown): MylJsonParseResult {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { cards?: unknown }).cards)
    ? (raw as { cards: unknown[] }).cards
    : null;
  if (!list) {
    return { cards: [], skipped: [{ name: "-", reason: "JSON debe ser un arreglo o { cards: [] }" }], duplicatesInFile: 0 };
  }
  const cards: MylDemoCard[] = [];
  const skipped: MylJsonParseResult["skipped"] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;
  for (const item of list) {
    const parsed = externalCardSchema.safeParse(item);
    if (!parsed.success) {
      skipped.push({
        name: typeof item === "object" && item && "name" in item ? String((item as { name: unknown }).name) : "?",
        reason: parsed.error.issues[0]?.message ?? "Fila inválida",
      });
      continue;
    }
    const set = resolveSet(parsed.data.set);
    const cardType = resolveType(parsed.data.attributes?.cardType);
    if (!set) {
      skipped.push({ name: parsed.data.name, reason: "Edición desconocida" });
      continue;
    }
    if (!cardType) {
      skipped.push({ name: parsed.data.name, reason: "cardType inválido" });
      continue;
    }
    if (parsed.data.imageUrl) {
      const url = httpsUrl.safeParse(parsed.data.imageUrl);
      if (!url.success) {
        skipped.push({ name: parsed.data.name, reason: "imageUrl debe ser https" });
        continue;
      }
    }
    const key = `${set.slug}:${slugifyStable(parsed.data.name)}`;
    if (seen.has(key)) {
      duplicatesInFile += 1;
      skipped.push({ name: parsed.data.name, reason: "Duplicada en el archivo" });
      continue;
    }
    seen.add(key);
    const attrs = parsed.data.attributes ?? {};
    cards.push({
      set,
      name: parsed.data.name,
      rarity: parsed.data.rarity || "Real",
      cardType,
      raza: typeof attrs.raza === "string" ? attrs.raza : undefined,
      coste: typeof attrs.coste === "number" ? attrs.coste : undefined,
      fuerza: typeof attrs.fuerza === "number" ? attrs.fuerza : undefined,
      number: parsed.data.number,
      imageUrl: parsed.data.imageUrl,
    });
  }
  return { cards, skipped, duplicatesInFile };
}
