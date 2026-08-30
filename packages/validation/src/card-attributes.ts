import { z } from "zod";

const optionalString = z.string().trim().max(80).optional();
const optionalStringList = z.array(z.string().trim().max(80)).max(12).optional();
const optionalInt = z.number().int().optional().nullable();

export const pokemonCardAttributesSchema = z
  .object({
    source: optionalString,
    cardType: optionalString,
    pokemonType: optionalStringList,
    stage: optionalString,
    hp: optionalInt,
    regulationMark: optionalString,
    ruleBox: optionalStringList,
    trainerSubtype: optionalString,
    energySubtype: optionalString,
  })
  .passthrough();

export const yugiohCardAttributesSchema = z
  .object({
    source: optionalString,
    category: optionalString,
    attribute: optionalString,
    monsterType: optionalStringList,
    cardTypes: optionalStringList,
    level: optionalInt,
    rank: optionalInt,
    atk: optionalInt,
    def: optionalInt,
    pendulumScale: optionalInt,
    linkRating: optionalInt,
    spellTrapIcon: optionalString,
  })
  .passthrough();

export const magicCardAttributesSchema = z
  .object({
    source: optionalString,
    manaCost: optionalString.nullable(),
    manaValue: z.number().optional().nullable(),
    cmc: z.number().optional().nullable(),
    colors: optionalStringList,
    colorIdentity: optionalStringList,
    cardType: optionalString,
    subtypes: optionalStringList,
    power: optionalString.nullable(),
    toughness: optionalString.nullable(),
    keywords: optionalStringList,
    legalities: optionalStringList,
    oracleText: optionalString.nullable(),
    typeLine: optionalString,
  })
  .passthrough();

export const mylCardAttributesSchema = z
  .object({
    source: optionalString,
    cardType: optionalString,
    raza: optionalString,
    coste: optionalInt,
    fuerza: optionalInt,
    era: optionalString,
    legalidad: optionalString,
  })
  .passthrough();

export const onePieceCardAttributesSchema = z
  .object({
    source: optionalString,
    cardType: optionalString,
    color: optionalString,
    cost: optionalInt,
    power: optionalInt,
    attribute: optionalString,
  })
  .passthrough();

export const digimonCardAttributesSchema = z
  .object({
    source: optionalString,
    color: optionalString,
    cardType: optionalString,
    level: optionalInt,
    playCost: optionalInt,
    dp: optionalInt,
    form: optionalString,
    attribute: optionalString,
    digimonType: optionalStringList,
  })
  .passthrough();

export const gundamCardAttributesSchema = z
  .object({
    source: optionalString,
    cardType: optionalString,
    color: optionalString,
    level: optionalInt,
    cost: optionalInt,
    sourceTitle: optionalString,
    traits: optionalStringList,
    alternateArt: optionalString,
    linkConditions: optionalStringList,
  })
  .passthrough();

export const genericCardAttributesSchema = z
  .object({
    source: optionalString,
  })
  .passthrough();

const SCHEMAS: Record<string, z.ZodType<Record<string, unknown>>> = {
  pokemon: pokemonCardAttributesSchema,
  magic: magicCardAttributesSchema,
  yugioh: yugiohCardAttributesSchema,
  "mitos-y-leyendas": mylCardAttributesSchema,
  "one-piece": onePieceCardAttributesSchema,
  digimon: digimonCardAttributesSchema,
  gundam: gundamCardAttributesSchema,
};

export function cardAttributesSchemaFor(gameSlug: string) {
  return SCHEMAS[gameSlug] ?? genericCardAttributesSchema;
}

export type AttributeInspectResult = {
  valid: boolean;
  parsed: Record<string, unknown>;
  unknownKeys: string[];
  issues: Array<{ path: string; message: string }>;
};

const KNOWN_BY_GAME: Record<string, string[]> = {
  pokemon: ["source", "cardType", "pokemonType", "stage", "hp", "regulationMark", "ruleBox", "trainerSubtype", "energySubtype"],
  magic: [
    "source",
    "manaCost",
    "manaValue",
    "cmc",
    "colors",
    "colorIdentity",
    "cardType",
    "subtypes",
    "power",
    "toughness",
    "keywords",
    "legalities",
    "oracleText",
    "typeLine",
  ],
  yugioh: [
    "source",
    "category",
    "attribute",
    "monsterType",
    "cardTypes",
    "level",
    "rank",
    "atk",
    "def",
    "pendulumScale",
    "linkRating",
    "spellTrapIcon",
  ],
  "mitos-y-leyendas": ["source", "cardType", "raza", "coste", "fuerza", "era", "legalidad"],
  "one-piece": ["source", "cardType", "color", "cost", "power", "attribute"],
  digimon: ["source", "color", "cardType", "level", "playCost", "dp", "form", "attribute", "digimonType"],
  gundam: ["source", "cardType", "color", "level", "cost", "sourceTitle", "traits", "alternateArt", "linkConditions"],
};

export function inspectCardAttributes(gameSlug: string, raw: unknown): AttributeInspectResult {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const schema = cardAttributesSchemaFor(gameSlug);
  const parsed = schema.safeParse(record);
  const known = new Set(KNOWN_BY_GAME[gameSlug] ?? ["source"]);
  const unknownKeys = Object.keys(record).filter((key) => !known.has(key));
  return {
    valid: parsed.success,
    parsed: parsed.success ? (parsed.data as Record<string, unknown>) : record,
    unknownKeys,
    issues: parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  };
}
