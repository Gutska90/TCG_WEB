import { z } from "zod";

const optionalString = z.string().trim().max(160).optional().nullable();
const optionalStringList = z.array(z.string().trim().max(80)).max(24).optional();
const optionalInt = z.number().int().optional().nullable();
const sourceQuality = z.enum(["VERIFIED_PROVIDER", "CURATED_VERIFIED", "SYNTHETIC"]).optional();

const provenance = {
  source: optionalString,
  sourceQuality,
  sourceUrl: optionalString,
  sourceId: optionalString,
  sourceRetrievedAt: optionalString,
  verified: z.boolean().optional(),
};

const typedValue = z.object({ type: z.string().trim().max(40), value: z.string().trim().max(20) });

export const pokemonCardAttributesSchema = z
  .object({
    ...provenance,
    cardType: optionalString,
    subtypes: optionalStringList,
    pokemonTypes: optionalStringList,
    pokemonType: optionalStringList,
    hp: optionalInt,
    evolvesFrom: optionalString,
    evolvesTo: optionalStringList,
    regulationMark: optionalString,
    retreatCost: optionalInt,
    weaknesses: z.array(typedValue).max(8).optional(),
    resistances: z.array(typedValue).max(8).optional(),
    weaknessTypes: optionalStringList,
    resistanceTypes: optionalStringList,
    attackCosts: z.array(z.array(z.string().trim().max(40)).max(12)).max(8).optional(),
    maxAttackEnergyCost: optionalInt,
    illustrator: optionalString,
    legalities: optionalStringList,
    stage: optionalString,
    ruleBox: optionalStringList,
  })
  .passthrough();

export const yugiohCardAttributesSchema = z
  .object({
    ...provenance,
    category: optionalString,
    attribute: optionalString,
    monsterType: optionalStringList,
    mechanics: optionalStringList,
    cardTypes: optionalStringList,
    level: optionalInt,
    rank: optionalInt,
    atk: optionalInt,
    def: optionalInt,
    pendulumScale: optionalInt,
    linkRating: optionalInt,
    linkMarkers: optionalStringList,
    spellTrapIcon: optionalString,
  })
  .passthrough();

export const magicCardAttributesSchema = z
  .object({
    ...provenance,
    manaCost: optionalString,
    manaValue: z.number().optional().nullable(),
    cmc: z.number().optional().nullable(),
    colors: optionalStringList,
    colorIdentity: optionalStringList,
    cardTypes: optionalStringList,
    cardType: optionalString,
    supertypes: optionalStringList,
    subtypes: optionalStringList,
    power: optionalString,
    toughness: optionalString,
    powerText: optionalString,
    toughnessText: optionalString,
    powerNumeric: z.number().optional().nullable(),
    toughnessNumeric: z.number().optional().nullable(),
    keywords: optionalStringList,
    legalities: optionalStringList,
    oracleText: optionalString,
    typeLine: optionalString,
  })
  .passthrough();

export const mylCardAttributesSchema = z
  .object({
    ...provenance,
    cardType: optionalString,
    raza: optionalString,
    coste: optionalInt,
    fuerza: optionalInt,
    keywords: optionalStringList,
    edicion: optionalString,
    bloque: optionalString,
    era: optionalString,
    collectorNumber: optionalString,
    illustrator: optionalString,
    legalities: z
      .array(
        z.object({
          format: z.string().trim().max(80),
          status: z.string().trim().max(40),
          effectiveFrom: z.string().trim().max(40).optional(),
        }),
      )
      .max(12)
      .optional(),
  })
  .passthrough();

export const onePieceCardAttributesSchema = z
  .object({
    ...provenance,
    cardType: optionalString,
    colors: optionalStringList,
    color: optionalString,
    cost: optionalInt,
    power: optionalInt,
    counter: optionalInt,
    life: optionalInt,
    attribute: optionalString,
    traits: optionalStringList,
    blockIcon: optionalString,
    illustrationType: optionalString,
    trigger: z.boolean().optional(),
  })
  .passthrough();

const digivolve = z.object({
  color: z.string().trim().max(40).optional(),
  cost: z.number().int().optional(),
  fromLevel: z.number().int().optional(),
});

export const digimonCardAttributesSchema = z
  .object({
    ...provenance,
    colors: optionalStringList,
    color: optionalString,
    cardType: optionalString,
    level: optionalInt,
    playCost: optionalInt,
    dp: optionalInt,
    form: optionalString,
    attribute: optionalString,
    traits: optionalStringList,
    digimonType: optionalStringList,
    digivolutionRequirements: z.array(digivolve).max(8).optional(),
  })
  .passthrough();

export const gundamCardAttributesSchema = z
  .object({
    ...provenance,
    cardType: optionalString,
    color: optionalString,
    level: optionalInt,
    cost: optionalInt,
    ap: optionalInt,
    hp: optionalInt,
    zones: optionalStringList,
    sourceTitle: optionalString,
    traits: optionalStringList,
    linkConditions: optionalStringList,
    alternateArt: optionalString,
  })
  .passthrough();

export const genericCardAttributesSchema = z.object({ ...provenance }).passthrough();

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
  pokemon: Object.keys(pokemonCardAttributesSchema.shape),
  magic: Object.keys(magicCardAttributesSchema.shape),
  yugioh: Object.keys(yugiohCardAttributesSchema.shape),
  "mitos-y-leyendas": Object.keys(mylCardAttributesSchema.shape),
  "one-piece": Object.keys(onePieceCardAttributesSchema.shape),
  digimon: Object.keys(digimonCardAttributesSchema.shape),
  gundam: Object.keys(gundamCardAttributesSchema.shape),
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

export const REQUIRED_FILTER_PATHS: Record<string, string[]> = {
  pokemon: ["cardType", "pokemonTypes", "hp"],
  magic: ["cardTypes", "manaValue", "colors"],
  yugioh: ["category", "attribute", "atk"],
  "mitos-y-leyendas": ["cardType", "raza", "coste"],
  "one-piece": ["cardType", "colors", "power"],
  digimon: ["cardType", "colors", "level", "dp"],
  gundam: ["cardType", "color", "level", "cost"],
};
