/**
 * CATALOG.1/2 — filter definitions per game.slug.
 * Canonical codes in English/UPPER_SNAKE; labels es-CL at the edge.
 * Options for SELECT come from DISTINCT catalog values, never from hardcoded demo lists.
 */

export const CATALOG_FILTER_TYPES = ["SELECT", "MULTI_SELECT", "NUMBER_RANGE", "BOOLEAN", "TEXT"] as const;
export type CatalogFilterType = (typeof CATALOG_FILTER_TYPES)[number];

export const CATALOG_FILTER_GROUPS = ["card", "marketplace"] as const;
export type CatalogFilterGroup = (typeof CATALOG_FILTER_GROUPS)[number];

export const CATALOG_FILTER_TIERS = ["PRIMARY", "ADVANCED"] as const;
export type CatalogFilterTier = (typeof CATALOG_FILTER_TIERS)[number];

export const CATALOG_FILTER_SUPPORTS = ["FULL", "PARTIAL"] as const;
export type CatalogFilterSupport = (typeof CATALOG_FILTER_SUPPORTS)[number];

export const CATALOG_SOURCE_QUALITIES = ["VERIFIED_PROVIDER", "CURATED_VERIFIED", "SYNTHETIC"] as const;
export type CatalogSourceQuality = (typeof CATALOG_SOURCE_QUALITIES)[number];

export const SYNTHETIC_ATTRIBUTE_SOURCES = ["synthetic-showcase", "showcase-seed", "seed"] as const;

export type CatalogFilterSource =
  | { kind: "text" }
  | { kind: "set" }
  | { kind: "column"; column: "rarity" | "supertype" | "number" }
  | { kind: "json"; path: string; array?: boolean }
  | { kind: "variant"; field: "language" | "finish" }
  | { kind: "listing"; field: "condition" | "price" | "hasListings" };

export type CatalogFilterRule = {
  key: string;
  oneOf?: string[];
  noneOf?: string[];
};

export type CatalogFilterVisibleWhen = {
  key?: string;
  oneOf?: string[];
  all?: CatalogFilterRule[];
  noneOf?: CatalogFilterRule[];
};

export type CatalogFilterDef = {
  key: string;
  label: string;
  group: CatalogFilterGroup;
  type: CatalogFilterType;
  source: CatalogFilterSource;
  order: number;
  tier?: CatalogFilterTier;
  multi?: boolean;
  range?: boolean;
  sortKey?: string;
  visibleWhen?: CatalogFilterVisibleWhen;
  labels?: Record<string, string>;
};

export type GameFilterDefinition = {
  gameSlug: string;
  support: CatalogFilterSupport;
  source: string;
  missing: string[];
  filters: CatalogFilterDef[];
  displayFields: Array<{ key: string; label: string }>;
};

function cardSelect(
  key: string,
  label: string,
  order: number,
  source: CatalogFilterSource,
  extra: Partial<CatalogFilterDef> = {},
): CatalogFilterDef {
  return { key, label, group: "card", type: "SELECT", source, order, tier: extra.tier ?? "PRIMARY", ...extra };
}

function cardMulti(
  key: string,
  label: string,
  order: number,
  path: string,
  extra: Partial<CatalogFilterDef> = {},
): CatalogFilterDef {
  return {
    key,
    label,
    group: "card",
    type: "MULTI_SELECT",
    source: { kind: "json", path, array: true },
    order,
    multi: true,
    tier: extra.tier ?? "PRIMARY",
    ...extra,
  };
}

function cardRange(
  key: string,
  label: string,
  order: number,
  path: string,
  extra: Partial<CatalogFilterDef> = {},
): CatalogFilterDef {
  return {
    key,
    label,
    group: "card",
    type: "NUMBER_RANGE",
    source: { kind: "json", path },
    order,
    range: true,
    sortKey: extra.sortKey ?? key,
    tier: extra.tier ?? "PRIMARY",
    ...extra,
  };
}

function cardText(
  key: string,
  label: string,
  order: number,
  path: string,
  extra: Partial<CatalogFilterDef> = {},
): CatalogFilterDef {
  return {
    key,
    label,
    group: "card",
    type: "TEXT",
    source: { kind: "json", path },
    order,
    tier: extra.tier ?? "ADVANCED",
    ...extra,
  };
}

export const COMMON_CARD_FILTERS: CatalogFilterDef[] = [
  { key: "q", label: "Nombre o número", group: "card", type: "TEXT", source: { kind: "text" }, order: 0, tier: "PRIMARY" },
  { key: "set", label: "Expansión", group: "card", type: "SELECT", source: { kind: "set" }, order: 10, tier: "PRIMARY" },
  cardSelect("supertype", "Tipo (catálogo)", 20, { kind: "column", column: "supertype" }, { tier: "ADVANCED" }),
  cardSelect("rarity", "Rareza", 30, { kind: "column", column: "rarity" }),
];

export const COMMON_MARKETPLACE_FILTERS: CatalogFilterDef[] = [
  {
    key: "language",
    label: "Idioma",
    group: "marketplace",
    type: "SELECT",
    source: { kind: "variant", field: "language" },
    order: 80,
    tier: "PRIMARY",
  },
  {
    key: "finish",
    label: "Acabado",
    group: "marketplace",
    type: "SELECT",
    source: { kind: "variant", field: "finish" },
    order: 81,
    tier: "PRIMARY",
  },
  {
    key: "condition",
    label: "Condición",
    group: "marketplace",
    type: "SELECT",
    source: { kind: "listing", field: "condition" },
    order: 82,
    tier: "ADVANCED",
  },
  {
    key: "price",
    label: "Precio",
    group: "marketplace",
    type: "NUMBER_RANGE",
    source: { kind: "listing", field: "price" },
    order: 83,
    range: true,
    sortKey: "price",
    tier: "PRIMARY",
  },
  {
    key: "hasListings",
    label: "Con publicaciones",
    group: "marketplace",
    type: "BOOLEAN",
    source: { kind: "listing", field: "hasListings" },
    order: 84,
    tier: "ADVANCED",
  },
];

const POKEMON_TYPE_LABELS: Record<string, string> = {
  GRASS: "Planta",
  FIRE: "Fuego",
  WATER: "Agua",
  LIGHTNING: "Rayo",
  PSYCHIC: "Psíquico",
  FIGHTING: "Lucha",
  DARKNESS: "Oscuridad",
  METAL: "Metal",
  DRAGON: "Dragón",
  COLORLESS: "Incoloro",
  FAIRY: "Hada",
};

const POKEMON: CatalogFilterDef[] = [
  cardSelect("cardType", "Tipo de carta", 40, { kind: "json", path: "cardType" }, {
    labels: { POKEMON: "Pokémon", TRAINER: "Entrenador", ENERGY: "Energía" },
  }),
  cardMulti("subtypes", "Subtipo", 41, "subtypes"),
  cardMulti("pokemonTypes", "Tipo Pokémon", 42, "pokemonTypes", {
    labels: POKEMON_TYPE_LABELS,
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
  cardRange("hp", "HP", 43, "hp", { visibleWhen: { key: "cardType", oneOf: ["POKEMON"] } }),
  cardSelect("regulationMark", "Regulación", 44, { kind: "json", path: "regulationMark" }),
  cardText("evolvesFrom", "Evoluciona desde", 45, "evolvesFrom", {
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
  cardRange("retreatCost", "Retirada", 46, "retreatCost", {
    tier: "ADVANCED",
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
  cardMulti("weaknessTypes", "Debilidad", 47, "weaknessTypes", {
    labels: POKEMON_TYPE_LABELS,
    tier: "ADVANCED",
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
  cardMulti("resistanceTypes", "Resistencia", 48, "resistanceTypes", {
    labels: POKEMON_TYPE_LABELS,
    tier: "ADVANCED",
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
  cardRange("maxAttackEnergyCost", "Coste de ataque", 49, "maxAttackEnergyCost", {
    tier: "ADVANCED",
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
  cardMulti("legalities", "Formato", 50, "legalities", { tier: "ADVANCED" }),
  cardText("illustrator", "Ilustrador", 51, "illustrator", { tier: "ADVANCED" }),
];

const YUGIOH: CatalogFilterDef[] = [
  cardSelect("category", "Categoría", 40, { kind: "json", path: "category" }, {
    labels: { MONSTER: "Monstruo", SPELL: "Mágica", TRAP: "Trampa" },
  }),
  cardSelect("attribute", "Atributo", 41, { kind: "json", path: "attribute" }, {
    labels: {
      DARK: "Oscuridad",
      LIGHT: "Luz",
      EARTH: "Tierra",
      WATER: "Agua",
      FIRE: "Fuego",
      WIND: "Viento",
      DIVINE: "Divino",
    },
    visibleWhen: { key: "category", oneOf: ["MONSTER"] },
  }),
  cardMulti("monsterType", "Tipo de monstruo", 42, "monsterType", {
    visibleWhen: { key: "category", oneOf: ["MONSTER"] },
  }),
  cardMulti("mechanics", "Mecánica", 43, "mechanics", {
    visibleWhen: { key: "category", oneOf: ["MONSTER"] },
  }),
  cardRange("level", "Nivel", 44, "level", {
    visibleWhen: {
      key: "category",
      oneOf: ["MONSTER"],
      noneOf: [{ key: "mechanics", oneOf: ["XYZ", "LINK"] }],
    },
  }),
  cardRange("rank", "Rango", 45, "rank", {
    visibleWhen: { all: [{ key: "category", oneOf: ["MONSTER"] }, { key: "mechanics", oneOf: ["XYZ"] }] },
  }),
  cardRange("atk", "ATK", 46, "atk", { visibleWhen: { key: "category", oneOf: ["MONSTER"] } }),
  cardRange("def", "DEF", 47, "def", {
    visibleWhen: {
      key: "category",
      oneOf: ["MONSTER"],
      noneOf: [{ key: "mechanics", oneOf: ["LINK"] }],
    },
  }),
  cardRange("pendulumScale", "Escala Péndulo", 48, "pendulumScale", {
    tier: "ADVANCED",
    visibleWhen: { all: [{ key: "category", oneOf: ["MONSTER"] }, { key: "mechanics", oneOf: ["PENDULUM"] }] },
  }),
  cardRange("linkRating", "Link", 49, "linkRating", {
    tier: "ADVANCED",
    visibleWhen: { all: [{ key: "category", oneOf: ["MONSTER"] }, { key: "mechanics", oneOf: ["LINK"] }] },
  }),
  cardSelect("spellTrapIcon", "Icono", 50, { kind: "json", path: "spellTrapIcon" }, {
    labels: {
      NORMAL: "Normal",
      CONTINUOUS: "Continua",
      QUICK_PLAY: "Juego rápido",
      FIELD: "Campo",
      EQUIP: "Equipo",
      RITUAL: "Ritual",
      COUNTER: "Contraefecto",
    },
    tier: "ADVANCED",
    visibleWhen: { key: "category", oneOf: ["SPELL", "TRAP"] },
  }),
];

const MAGIC: CatalogFilterDef[] = [
  cardMulti("colors", "Color", 40, "colors", {
    labels: { W: "Blanco", U: "Azul", B: "Negro", R: "Rojo", G: "Verde", C: "Incoloro" },
  }),
  cardMulti("colorIdentity", "Identidad de color", 41, "colorIdentity", {
    labels: { W: "Blanco", U: "Azul", B: "Negro", R: "Rojo", G: "Verde", C: "Incoloro" },
    tier: "ADVANCED",
  }),
  cardMulti("cardTypes", "Tipo de carta", 42, "cardTypes"),
  cardMulti("subtypes", "Subtipo", 43, "subtypes"),
  cardRange("manaValue", "Valor de maná", 44, "manaValue"),
  cardRange("powerNumeric", "Fuerza (numérica)", 45, "powerNumeric", {
    sortKey: "powerNumeric",
    visibleWhen: { key: "cardTypes", oneOf: ["CREATURE"] },
  }),
  cardRange("toughnessNumeric", "Resistencia (numérica)", 46, "toughnessNumeric", {
    sortKey: "toughnessNumeric",
    visibleWhen: { key: "cardTypes", oneOf: ["CREATURE"] },
  }),
  cardMulti("legalities", "Formato", 47, "legalities"),
  cardMulti("keywords", "Palabras clave", 48, "keywords", { tier: "ADVANCED" }),
];

const MYL: CatalogFilterDef[] = [
  cardSelect("cardType", "Tipo de carta", 40, { kind: "json", path: "cardType" }, {
    labels: {
      ALIADO: "Aliado",
      TALISMAN: "Talismán",
      TOTEM: "Tótem",
      ARMA: "Arma",
      ORO: "Oro",
      MONUMENTO: "Monumento",
    },
  }),
  cardSelect("raza", "Raza", 41, { kind: "json", path: "raza" }, {
    visibleWhen: { key: "cardType", oneOf: ["ALIADO"] },
  }),
  cardRange("coste", "Coste de oro", 42, "coste"),
  cardRange("fuerza", "Fuerza", 43, "fuerza", { visibleWhen: { key: "cardType", oneOf: ["ALIADO"] } }),
  cardSelect("edicion", "Edición", 44, { kind: "json", path: "edicion" }, { tier: "ADVANCED" }),
  cardSelect("era", "Época / bloque", 45, { kind: "json", path: "era" }, { tier: "ADVANCED" }),
];

const ONE_PIECE: CatalogFilterDef[] = [
  cardSelect("cardType", "Tipo de carta", 40, { kind: "json", path: "cardType" }, {
    labels: { LEADER: "Líder", CHARACTER: "Personaje", EVENT: "Evento", STAGE: "Escenario" },
  }),
  cardMulti("colors", "Color", 41, "colors"),
  cardSelect("illustrationType", "Ilustración", 42, { kind: "json", path: "illustrationType" }, { tier: "ADVANCED" }),
  cardSelect("blockIcon", "Block", 43, { kind: "json", path: "blockIcon" }),
  cardRange("cost", "Coste", 44, "cost", {
    visibleWhen: { key: "cardType", oneOf: ["CHARACTER", "EVENT", "STAGE"] },
  }),
  cardRange("power", "Power", 45, "power", {
    visibleWhen: { key: "cardType", oneOf: ["LEADER", "CHARACTER"] },
  }),
  cardRange("life", "Life", 46, "life", { visibleWhen: { key: "cardType", oneOf: ["LEADER"] } }),
  cardRange("counter", "Counter", 47, "counter", {
    visibleWhen: { key: "cardType", oneOf: ["CHARACTER"] },
  }),
  cardSelect("attribute", "Atributo", 48, { kind: "json", path: "attribute" }, {
    visibleWhen: { key: "cardType", oneOf: ["LEADER", "CHARACTER"] },
  }),
  cardMulti("traits", "Tipo", 49, "traits", {
    visibleWhen: { key: "cardType", oneOf: ["LEADER", "CHARACTER"] },
  }),
];

const DIGIMON: CatalogFilterDef[] = [
  cardMulti("colors", "Color", 40, "colors"),
  cardSelect("cardType", "Tipo de carta", 41, { kind: "json", path: "cardType" }),
  cardRange("level", "Nivel", 42, "level", {
    visibleWhen: { key: "cardType", oneOf: ["DIGIMON", "DIGI_EGG"] },
  }),
  cardRange("playCost", "Coste", 43, "playCost"),
  cardRange("dp", "DP", 44, "dp", { visibleWhen: { key: "cardType", oneOf: ["DIGIMON"] } }),
  cardSelect("form", "Forma", 45, { kind: "json", path: "form" }, {
    visibleWhen: { key: "cardType", oneOf: ["DIGIMON"] },
  }),
  cardSelect("attribute", "Atributo", 46, { kind: "json", path: "attribute" }, {
    visibleWhen: { key: "cardType", oneOf: ["DIGIMON"] },
  }),
  cardMulti("traits", "Tipo / Trait", 47, "traits"),
];

const GUNDAM: CatalogFilterDef[] = [
  cardSelect("cardType", "Tipo", 40, { kind: "json", path: "cardType" }),
  cardSelect("color", "Color", 41, { kind: "json", path: "color" }),
  cardRange("level", "Level", 42, "level"),
  cardRange("cost", "Cost", 43, "cost"),
  cardSelect("alternateArt", "Arte alternativo", 44, { kind: "json", path: "alternateArt" }, { tier: "ADVANCED" }),
  cardSelect("sourceTitle", "Source Title", 45, { kind: "json", path: "sourceTitle" }, { tier: "ADVANCED" }),
  cardMulti("traits", "Trait", 46, "traits", { tier: "ADVANCED" }),
  cardMulti("linkConditions", "Link", 47, "linkConditions", { tier: "ADVANCED" }),
  cardMulti("zones", "Zona", 48, "zones", { tier: "ADVANCED" }),
  cardRange("ap", "AP", 49, "ap", {
    tier: "ADVANCED",
    visibleWhen: { key: "cardType", oneOf: ["UNIT"] },
  }),
  cardRange("hp", "HP", 50, "hp", {
    tier: "ADVANCED",
    visibleWhen: { key: "cardType", oneOf: ["UNIT", "BASE"] },
  }),
];

function assemble(
  gameSlug: string,
  support: CatalogFilterSupport,
  source: string,
  missing: string[],
  extra: CatalogFilterDef[],
  displayFields: Array<{ key: string; label: string }>,
): GameFilterDefinition {
  return {
    gameSlug,
    support,
    source,
    missing,
    filters: [...COMMON_CARD_FILTERS, ...extra, ...COMMON_MARKETPLACE_FILTERS],
    displayFields,
  };
}

export const GAME_FILTER_DEFINITIONS: Record<string, GameFilterDefinition> = {
  pokemon: assemble(
    "pokemon",
    "PARTIAL",
    "Pokémon TCG API importer + curated/reference fixtures; showcase is SYNTHETIC",
    ["full live catalog; regulationMark only when the provider sends it"],
    POKEMON,
    [
      { key: "cardType", label: "Tipo de carta" },
      { key: "pokemonTypes", label: "Tipo" },
      { key: "subtypes", label: "Subtipo" },
      { key: "hp", label: "HP" },
      { key: "weaknesses", label: "Debilidad" },
      { key: "retreatCost", label: "Retirada" },
      { key: "regulationMark", label: "Regulación" },
    ],
  ),
  magic: assemble(
    "magic",
    "PARTIAL",
    "Scryfall importer (verified provider when imported)",
    ["artist facet; live catalog only after Scryfall import"],
    MAGIC,
    [
      { key: "colors", label: "Color" },
      { key: "cardTypes", label: "Tipo" },
      { key: "manaValue", label: "Valor de maná" },
      { key: "manaCost", label: "Coste" },
      { key: "powerText", label: "Fuerza" },
      { key: "toughnessText", label: "Resistencia" },
    ],
  ),
  "one-piece": assemble(
    "one-piece",
    "PARTIAL",
    "curated official Bandai card-list fixtures; no bulk importer",
    ["Bandai bulk import", "counter/life coverage outside reference cards"],
    ONE_PIECE,
    [
      { key: "cardType", label: "Tipo" },
      { key: "colors", label: "Color" },
      { key: "cost", label: "Coste" },
      { key: "power", label: "Power" },
      { key: "life", label: "Life" },
      { key: "attribute", label: "Atributo" },
      { key: "traits", label: "Tipo" },
    ],
  ),
  yugioh: assemble(
    "yugioh",
    "PARTIAL",
    "curated Konami-database fixtures; no Konami scrape",
    ["licensed bulk importer", "pendulum/link coverage outside reference"],
    YUGIOH,
    [
      { key: "category", label: "Categoría" },
      { key: "attribute", label: "Atributo" },
      { key: "monsterType", label: "Tipo" },
      { key: "mechanics", label: "Mecánica" },
      { key: "level", label: "Nivel" },
      { key: "rank", label: "Rango" },
      { key: "atk", label: "ATK" },
      { key: "def", label: "DEF" },
    ],
  ),
  "mitos-y-leyendas": assemble(
    "mitos-y-leyendas",
    "PARTIAL",
    "curated official MyL fixtures (tor.myl.cl); no mass scrape",
    ["official frecuencia importer", "versioned banlist (filter omitted until then)"],
    MYL,
    [
      { key: "cardType", label: "Tipo" },
      { key: "raza", label: "Raza" },
      { key: "coste", label: "Coste" },
      { key: "fuerza", label: "Fuerza" },
      { key: "edicion", label: "Edición" },
    ],
  ),
  digimon: assemble(
    "digimon",
    "PARTIAL",
    "curated official Digimon Card Game fixtures; no bulk importer",
    ["official bulk importer"],
    DIGIMON,
    [
      { key: "colors", label: "Color" },
      { key: "cardType", label: "Tipo" },
      { key: "level", label: "Nivel" },
      { key: "dp", label: "DP" },
      { key: "form", label: "Forma" },
      { key: "attribute", label: "Atributo" },
      { key: "traits", label: "Tipo" },
    ],
  ),
  gundam: assemble(
    "gundam",
    "PARTIAL",
    "curated official Gundam Card Game fixtures; no bulk importer",
    ["official bulk importer"],
    GUNDAM,
    [
      { key: "color", label: "Color" },
      { key: "cardType", label: "Tipo" },
      { key: "level", label: "Level" },
      { key: "cost", label: "Cost" },
      { key: "ap", label: "AP" },
      { key: "hp", label: "HP" },
      { key: "sourceTitle", label: "Source Title" },
      { key: "traits", label: "Trait" },
    ],
  ),
};

export const COMMON_ONLY_DEFINITION: GameFilterDefinition = assemble(
  "unknown",
  "PARTIAL",
  "common filters only",
  ["game-specific attributes"],
  [],
  [],
);

export function getGameFilterDefinition(gameSlug: string | undefined): GameFilterDefinition {
  if (!gameSlug) return COMMON_ONLY_DEFINITION;
  return GAME_FILTER_DEFINITIONS[gameSlug] ?? COMMON_ONLY_DEFINITION;
}

export function catalogFilterByKey(def: GameFilterDefinition, key: string): CatalogFilterDef | undefined {
  return def.filters.find((filter) => filter.key === key);
}

const ATTR_ALIASES: Record<string, string> = {
  pokemonType: "pokemonTypes",
  cardType: "cardTypes",
  color: "colors",
  digimonType: "traits",
  cardTypes: "mechanics",
  power: "powerNumeric",
  toughness: "toughnessNumeric",
};

export function resolveAttrFilterKey(def: GameFilterDefinition, rawKey: string): CatalogFilterDef | undefined {
  const direct = catalogFilterByKey(def, rawKey);
  if (direct) return direct;
  if (rawKey.endsWith("Min") || rawKey.endsWith("Max")) {
    const base = rawKey.replace(/Min$|Max$/, "");
    const range = catalogFilterByKey(def, base) ?? catalogFilterByKey(def, ATTR_ALIASES[base] ?? "");
    if (range?.type === "NUMBER_RANGE") return range;
  }
  const aliased = ATTR_ALIASES[rawKey];
  if (aliased) {
    const mapped = catalogFilterByKey(def, aliased);
    if (mapped) return mapped;
  }
  return undefined;
}

export function isCommonSearchKey(key: string): boolean {
  return (
    key === "q" ||
    key === "game" ||
    key === "set" ||
    key === "rarity" ||
    key === "supertype" ||
    key === "language" ||
    key === "finish" ||
    key === "condition" ||
    key === "hasListings" ||
    key === "price" ||
    key === "priceMin" ||
    key === "priceMax" ||
    key === "sort" ||
    key === "page" ||
    key === "pageSize"
  );
}

export function isKnownCatalogAttrKey(key: string): boolean {
  for (const definition of Object.values(GAME_FILTER_DEFINITIONS)) {
    const filter = resolveAttrFilterKey(definition, key);
    if (filter?.source.kind === "json") return true;
  }
  return false;
}

function selectedList(selected: Record<string, string[] | undefined>, key: string): string[] {
  return selected[key] ?? selected[`${key}Min`] ?? selected[`${key}Max`] ?? [];
}

export function isFilterVisible(
  filter: CatalogFilterDef,
  selected: Record<string, string[] | undefined>,
): boolean {
  const self = selectedList(selected, filter.key);
  if (self.length > 0) return true;
  const when = filter.visibleWhen;
  if (!when) return true;
  const required: CatalogFilterRule[] = [];
  if (when.key && when.oneOf) required.push({ key: when.key, oneOf: when.oneOf });
  if (when.all) required.push(...when.all);
  for (const rule of required) {
    const current = selectedList(selected, rule.key).map((value) => normalizeCatalogCode(value));
    if (rule.oneOf?.length) {
      if (current.length === 0) return false;
      if (!current.some((value) => rule.oneOf?.includes(value))) return false;
    }
    if (rule.noneOf?.length) {
      if (current.some((value) => rule.noneOf?.includes(value))) return false;
    }
  }
  if (when.noneOf) {
    for (const rule of when.noneOf) {
      const current = selectedList(selected, rule.key).map((value) => normalizeCatalogCode(value));
      const banned = rule.oneOf ?? rule.noneOf ?? [];
      if (current.some((value) => banned.includes(value))) return false;
    }
  }
  return true;
}

export function normalizeCatalogCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const compact = trimmed.replace(/[\s-]+/g, "_").toUpperCase();
  return VALUE_ALIASES[compact] ?? compact;
}

const VALUE_ALIASES: Record<string, string> = {
  FUEGO: "FIRE",
  FIRE: "FIRE",
  AGUA: "WATER",
  WATER: "WATER",
  PLANTA: "GRASS",
  GRASS: "GRASS",
  RAYO: "LIGHTNING",
  LIGHTNING: "LIGHTNING",
  PSIQUICO: "PSYCHIC",
  PSYCHIC: "PSYCHIC",
  LUCHA: "FIGHTING",
  FIGHTING: "FIGHTING",
  OSCURIDAD: "DARKNESS",
  DARKNESS: "DARKNESS",
  DARK: "DARK",
  METAL: "METAL",
  DRAGON: "DRAGON",
  INCOLORO: "COLORLESS",
  COLORLESS: "COLORLESS",
  HADA: "FAIRY",
  FAIRY: "FAIRY",
  BASICO: "BASIC",
  BASIC: "BASIC",
  EX: "EX",
  POKEMON: "POKEMON",
  "POKÉMON": "POKEMON",
  ENTRENADOR: "TRAINER",
  TRAINER: "TRAINER",
  ENERGIA: "ENERGY",
  ENERGY: "ENERGY",
  MONSTRUO: "MONSTER",
  MONSTER: "MONSTER",
  MAGICA: "SPELL",
  SPELL: "SPELL",
  TRAMPA: "TRAP",
  TRAP: "TRAP",
  ALIADO: "ALIADO",
  TALISMAN: "TALISMAN",
  "TALISMÁN": "TALISMAN",
  TOTEM: "TOTEM",
  "TÓTEM": "TOTEM",
  ARMA: "ARMA",
  ORO: "ORO",
  MONUMENTO: "MONUMENTO",
  ANCESTRAL: "ANCESTRAL",
  ETERNO: "ETERNO",
  SOMBRA: "SOMBRA",
  GUERRERO: "GUERRERO",
  HEROE: "HEROE",
  "HÉROE": "HEROE",
  CABALLERO: "CABALLERO",
  CREATURE: "CREATURE",
  INSTANT: "INSTANT",
  SORCERY: "SORCERY",
  ARTIFACT: "ARTIFACT",
  ENCHANTMENT: "ENCHANTMENT",
  LAND: "LAND",
  PLANESWALKER: "PLANESWALKER",
  BATTLE: "BATTLE",
  DIGIMON: "DIGIMON",
  TAMER: "TAMER",
  OPTION: "OPTION",
  DIGI_EGG: "DIGI_EGG",
  UNIT: "UNIT",
  PILOT: "PILOT",
  COMMAND: "COMMAND",
  BASE: "BASE",
  RESOURCE: "RESOURCE",
  LEADER: "LEADER",
  CHARACTER: "CHARACTER",
  EVENT: "EVENT",
  STAGE: "STAGE",
  ROOKIE: "ROOKIE",
  VACCINE: "VACCINE",
};

export function labelForFilterValue(filter: CatalogFilterDef, value: string): string {
  return filter.labels?.[value] ?? filter.labels?.[normalizeCatalogCode(value)] ?? value;
}

export const SEARCH_SORTS = [
  "relevance",
  "releasedAt",
  "price",
  "nameAsc",
  "nameDesc",
  "hp",
  "atk",
  "level",
  "manaValue",
  "powerNumeric",
  "toughnessNumeric",
] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export function sortAllowedForGame(sort: string, gameSlug: string | undefined): boolean {
  if (sort === "relevance" || sort === "releasedAt" || sort === "price" || sort === "nameAsc" || sort === "nameDesc") {
    return true;
  }
  const def = getGameFilterDefinition(gameSlug);
  return def.filters.some((filter) => filter.sortKey === sort);
}

function formatDisplayValue(raw: unknown, filter: CatalogFilterDef | undefined): string {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          if (rec.type != null && rec.value != null) {
            const type = filter ? labelForFilterValue(filter, String(rec.type)) : String(rec.type);
            return `${type} ${rec.value}`;
          }
          if (rec.color != null && rec.cost != null) {
            return `${rec.color} / ${rec.cost}${rec.fromLevel != null ? ` / Lv.${rec.fromLevel}` : ""}`;
          }
          return Object.values(rec)
            .filter((value) => value != null && value !== "")
            .map(String)
            .join(" · ");
        }
        return filter ? labelForFilterValue(filter, String(item)) : String(item);
      })
      .filter(Boolean)
      .join(", ");
  }
  const value = String(raw);
  return filter ? labelForFilterValue(filter, value) : value;
}

const DISPLAY_FALLBACKS: Record<string, string[]> = {
  pokemonTypes: ["pokemonType"],
  cardTypes: ["cardType"],
  colors: ["color"],
  mechanics: ["cardTypes"],
  powerText: ["power"],
  toughnessText: ["toughness"],
  traits: ["digimonType"],
};

export function presentAttributeFields(
  gameSlug: string,
  attributes: Record<string, unknown>,
): Array<{ key: string; label: string; value: string }> {
  const def = getGameFilterDefinition(gameSlug);
  const rows: Array<{ key: string; label: string; value: string }> = [];
  for (const field of def.displayFields) {
    const raw =
      attributes[field.key] ??
      DISPLAY_FALLBACKS[field.key]?.map((key) => attributes[key]).find((value) => value != null && value !== "");
    if (raw == null || raw === "") continue;
    const filter = catalogFilterByKey(def, field.key);
    const display = formatDisplayValue(raw, filter);
    if (!display || display === "{}") continue;
    rows.push({ key: field.key, label: field.label, value: display });
  }
  return rows;
}

export function isSyntheticCardAttributes(attributes: Record<string, unknown> | null | undefined): boolean {
  if (!attributes) return false;
  if (attributes.sourceQuality === "SYNTHETIC") return true;
  const source = String(attributes.source ?? "");
  return (SYNTHETIC_ATTRIBUTE_SOURCES as readonly string[]).includes(source);
}
