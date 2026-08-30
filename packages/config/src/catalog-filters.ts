/**
 * CATALOG.1 — filter definitions per game.slug.
 * Canonical codes in English/UPPER_SNAKE; labels es-CL at the edge.
 * Options for SELECT come from the catalog at request time, not from infinite hardcoded lists.
 */

export const CATALOG_FILTER_TYPES = ["SELECT", "MULTI_SELECT", "NUMBER_RANGE", "BOOLEAN", "TEXT"] as const;
export type CatalogFilterType = (typeof CATALOG_FILTER_TYPES)[number];

export const CATALOG_FILTER_GROUPS = ["card", "marketplace"] as const;
export type CatalogFilterGroup = (typeof CATALOG_FILTER_GROUPS)[number];

export const CATALOG_FILTER_SUPPORTS = ["FULL", "PARTIAL"] as const;
export type CatalogFilterSupport = (typeof CATALOG_FILTER_SUPPORTS)[number];

export type CatalogFilterSource =
  | { kind: "text" }
  | { kind: "set" }
  | { kind: "column"; column: "rarity" | "supertype" | "number" }
  | { kind: "json"; path: string; array?: boolean }
  | { kind: "variant"; field: "language" | "finish" }
  | { kind: "listing"; field: "condition" | "price" | "hasListings" };

export type CatalogFilterVisibleWhen = {
  key: string;
  oneOf: string[];
};

export type CatalogFilterDef = {
  key: string;
  label: string;
  group: CatalogFilterGroup;
  type: CatalogFilterType;
  source: CatalogFilterSource;
  order: number;
  multi?: boolean;
  /** Query keys for NUMBER_RANGE: attr.<key>Min / attr.<key>Max */
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
  return { key, label, group: "card", type: "SELECT", source, order, ...extra };
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
    ...extra,
  };
}

export const COMMON_CARD_FILTERS: CatalogFilterDef[] = [
  { key: "q", label: "Nombre o número", group: "card", type: "TEXT", source: { kind: "text" }, order: 0 },
  { key: "set", label: "Expansión", group: "card", type: "SELECT", source: { kind: "set" }, order: 10 },
  cardSelect("supertype", "Tipo (catálogo)", 20, { kind: "column", column: "supertype" }),
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
  },
  {
    key: "finish",
    label: "Acabado",
    group: "marketplace",
    type: "SELECT",
    source: { kind: "variant", field: "finish" },
    order: 81,
  },
  {
    key: "condition",
    label: "Condición",
    group: "marketplace",
    type: "SELECT",
    source: { kind: "listing", field: "condition" },
    order: 82,
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
  },
  {
    key: "hasListings",
    label: "Con publicaciones",
    group: "marketplace",
    type: "BOOLEAN",
    source: { kind: "listing", field: "hasListings" },
    order: 84,
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

const POKEMON_FILTERS: CatalogFilterDef[] = [
  cardSelect("cardType", "Tipo de carta", 40, { kind: "json", path: "cardType" }, {
    labels: { POKEMON: "Pokémon", TRAINER: "Entrenador", ENERGY: "Energía" },
  }),
  cardMulti("pokemonType", "Tipo Pokémon", 41, "pokemonType", {
    labels: POKEMON_TYPE_LABELS,
    visibleWhen: { key: "cardType", oneOf: ["POKEMON", "ENERGY"] },
  }),
  cardSelect("stage", "Evolución", 42, { kind: "json", path: "stage" }, {
    labels: { BASIC: "Básico", STAGE_1: "Fase 1", STAGE_2: "Fase 2", RESTORED: "Recuperado" },
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
  cardRange("hp", "HP", 43, "hp", { visibleWhen: { key: "cardType", oneOf: ["POKEMON"] } }),
  cardSelect("regulationMark", "Regulación", 44, { kind: "json", path: "regulationMark" }),
  cardMulti("ruleBox", "Mecánica", 45, "ruleBox", {
    visibleWhen: { key: "cardType", oneOf: ["POKEMON"] },
  }),
];

const YUGIOH_FILTERS: CatalogFilterDef[] = [
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
  cardMulti("cardTypes", "Mecánica", 43, "cardTypes", {
    visibleWhen: { key: "category", oneOf: ["MONSTER"] },
  }),
  cardRange("level", "Nivel / Rango", 44, "level", {
    visibleWhen: { key: "category", oneOf: ["MONSTER"] },
  }),
  cardRange("atk", "ATK", 45, "atk", { visibleWhen: { key: "category", oneOf: ["MONSTER"] } }),
  cardRange("def", "DEF", 46, "def", { visibleWhen: { key: "category", oneOf: ["MONSTER"] } }),
  cardRange("pendulumScale", "Escala Péndulo", 47, "pendulumScale", {
    visibleWhen: { key: "category", oneOf: ["MONSTER"] },
  }),
  cardRange("linkRating", "Link", 48, "linkRating", {
    visibleWhen: { key: "category", oneOf: ["MONSTER"] },
  }),
  cardSelect("spellTrapIcon", "Icono", 49, { kind: "json", path: "spellTrapIcon" }, {
    labels: {
      NORMAL: "Normal",
      CONTINUOUS: "Continua",
      QUICK_PLAY: "Juego rápido",
      FIELD: "Campo",
      EQUIP: "Equipo",
      RITUAL: "Ritual",
      COUNTER: "Contraefecto",
    },
    visibleWhen: { key: "category", oneOf: ["SPELL", "TRAP"] },
  }),
];

const MAGIC_FILTERS: CatalogFilterDef[] = [
  cardMulti("colors", "Color", 40, "colors", {
    labels: { W: "Blanco", U: "Azul", B: "Negro", R: "Rojo", G: "Verde", C: "Incoloro" },
  }),
  cardMulti("colorIdentity", "Identidad de color", 41, "colorIdentity", {
    labels: { W: "Blanco", U: "Azul", B: "Negro", R: "Rojo", G: "Verde", C: "Incoloro" },
  }),
  cardSelect("cardType", "Tipo de carta", 42, { kind: "json", path: "cardType" }),
  cardMulti("subtypes", "Subtipo", 43, "subtypes"),
  cardRange("manaValue", "Valor de maná", 44, "manaValue"),
  cardRange("power", "Fuerza", 45, "power", { visibleWhen: { key: "cardType", oneOf: ["Creature"] } }),
  cardRange("toughness", "Resistencia", 46, "toughness", {
    visibleWhen: { key: "cardType", oneOf: ["Creature"] },
  }),
  cardMulti("legalities", "Formato", 47, "legalities"),
  cardMulti("keywords", "Palabras clave", 48, "keywords"),
];

const MYL_FILTERS: CatalogFilterDef[] = [
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
    labels: { ANDINO: "Andino", COSTERO: "Costero", AUSTRAL: "Austral" },
  }),
  cardRange("coste", "Coste de oro", 42, "coste"),
  cardRange("fuerza", "Fuerza", 43, "fuerza", { visibleWhen: { key: "cardType", oneOf: ["ALIADO"] } }),
  cardSelect("era", "Época / bloque", 44, { kind: "json", path: "era" }),
  cardSelect("legalidad", "Legalidad", 45, { kind: "json", path: "legalidad" }, {
    labels: { LEGAL: "Legal", RESTRINGIDA: "Restringida", PROHIBIDA: "Prohibida" },
  }),
];

const ONE_PIECE_FILTERS: CatalogFilterDef[] = [
  cardSelect("cardType", "Tipo de carta", 40, { kind: "json", path: "cardType" }, {
    labels: { LEADER: "Líder", CHARACTER: "Personaje", EVENT: "Evento", STAGE: "Escenario" },
  }),
  cardSelect("color", "Color", 41, { kind: "json", path: "color" }),
  cardRange("cost", "Coste", 42, "cost"),
  cardRange("power", "Power", 43, "power", {
    visibleWhen: { key: "cardType", oneOf: ["LEADER", "CHARACTER"] },
  }),
  cardSelect("attribute", "Atributo", 44, { kind: "json", path: "attribute" }),
];

const DIGIMON_FILTERS: CatalogFilterDef[] = [
  cardSelect("color", "Color", 40, { kind: "json", path: "color" }),
  cardSelect("cardType", "Tipo de carta", 41, { kind: "json", path: "cardType" }),
  cardRange("level", "Nivel", 42, "level"),
  cardRange("playCost", "Coste", 43, "playCost"),
  cardRange("dp", "DP", 44, "dp"),
  cardSelect("form", "Forma", 45, { kind: "json", path: "form" }),
  cardSelect("attribute", "Atributo", 46, { kind: "json", path: "attribute" }),
  cardMulti("digimonType", "Tipo Digimon", 47, "digimonType"),
];

const GUNDAM_FILTERS: CatalogFilterDef[] = [
  cardSelect("cardType", "Tipo", 40, { kind: "json", path: "cardType" }),
  cardSelect("color", "Color", 41, { kind: "json", path: "color" }),
  cardRange("level", "Level", 42, "level"),
  cardRange("cost", "Cost", 43, "cost"),
  cardSelect("sourceTitle", "Source Title", 44, { kind: "json", path: "sourceTitle" }),
  cardMulti("traits", "Trait", 45, "traits"),
  cardSelect("alternateArt", "Arte alternativo", 46, { kind: "json", path: "alternateArt" }),
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
    "showcase-seed; Pokémon TCG API importer not in repo",
    ["regulationMark (no official importer)", "ruleBox", "official rarities / HP from provider"],
    POKEMON_FILTERS,
    [
      { key: "cardType", label: "Tipo de carta" },
      { key: "pokemonType", label: "Tipo" },
      { key: "stage", label: "Evolución" },
      { key: "hp", label: "HP" },
      { key: "regulationMark", label: "Regulación" },
    ],
  ),
  magic: assemble(
    "magic",
    "PARTIAL",
    "Scryfall importer (colors, manaValue, types, P/T, legalities when present)",
    ["artist filter", "full subtype facet until a set is imported"],
    MAGIC_FILTERS,
    [
      { key: "colors", label: "Color" },
      { key: "cardType", label: "Tipo" },
      { key: "manaValue", label: "Valor de maná" },
      { key: "manaCost", label: "Coste" },
      { key: "power", label: "Fuerza" },
      { key: "toughness", label: "Resistencia" },
    ],
  ),
  "one-piece": assemble(
    "one-piece",
    "PARTIAL",
    "showcase-seed; no Bandai importer",
    ["official colors/types from provider", "counter", "attribute"],
    ONE_PIECE_FILTERS,
    [
      { key: "cardType", label: "Tipo" },
      { key: "color", label: "Color" },
      { key: "cost", label: "Coste" },
      { key: "power", label: "Power" },
    ],
  ),
  yugioh: assemble(
    "yugioh",
    "PARTIAL",
    "showcase-seed; no Konami importer",
    ["official monster types / mechanics from provider", "pendulum/link until data exists"],
    YUGIOH_FILTERS,
    [
      { key: "category", label: "Categoría" },
      { key: "attribute", label: "Atributo" },
      { key: "monsterType", label: "Tipo" },
      { key: "level", label: "Nivel" },
      { key: "atk", label: "ATK" },
      { key: "def", label: "DEF" },
    ],
  ),
  "mitos-y-leyendas": assemble(
    "mitos-y-leyendas",
    "PARTIAL",
    "showcase-seed; no official MyL importer",
    ["official frecuencia (not Common/Rare)", "banlist/legalidad versionada", "bloque/era from provider"],
    MYL_FILTERS,
    [
      { key: "cardType", label: "Tipo" },
      { key: "raza", label: "Raza" },
      { key: "coste", label: "Coste" },
      { key: "fuerza", label: "Fuerza" },
      { key: "era", label: "Época" },
    ],
  ),
  digimon: assemble(
    "digimon",
    "PARTIAL",
    "definition only — no game/importer in repo",
    ["all live catalog values; do not invent until an importer exists"],
    DIGIMON_FILTERS,
    [
      { key: "color", label: "Color" },
      { key: "cardType", label: "Tipo" },
      { key: "level", label: "Nivel" },
      { key: "dp", label: "DP" },
      { key: "form", label: "Forma" },
    ],
  ),
  gundam: assemble(
    "gundam",
    "PARTIAL",
    "definition only — no game/importer in repo",
    ["all live catalog values; do not invent until an importer exists"],
    GUNDAM_FILTERS,
    [
      { key: "color", label: "Color" },
      { key: "cardType", label: "Tipo" },
      { key: "level", label: "Level" },
      { key: "cost", label: "Cost" },
      { key: "sourceTitle", label: "Source Title" },
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

export function resolveAttrFilterKey(def: GameFilterDefinition, rawKey: string): CatalogFilterDef | undefined {
  const direct = catalogFilterByKey(def, rawKey);
  if (direct) return direct;
  if (rawKey.endsWith("Min") || rawKey.endsWith("Max")) {
    const base = rawKey.replace(/Min$|Max$/, "");
    const range = catalogFilterByKey(def, base);
    if (range?.type === "NUMBER_RANGE") return range;
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

export function isFilterVisible(
  filter: CatalogFilterDef,
  selected: Record<string, string[] | undefined>,
): boolean {
  const self =
    selected[filter.key] ?? selected[`${filter.key}Min`] ?? selected[`${filter.key}Max`] ?? [];
  if (self.length > 0) return true;
  if (!filter.visibleWhen) return true;
  const current = selected[filter.visibleWhen.key] ?? [];
  if (current.length === 0) return false;
  return current.some((value) => filter.visibleWhen?.oneOf.includes(normalizeCatalogCode(value)));
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
  FASE_1: "STAGE_1",
  STAGE_1: "STAGE_1",
  FASE_2: "STAGE_2",
  STAGE_2: "STAGE_2",
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
  ANDINO: "ANDINO",
  COSTERO: "COSTERO",
  AUSTRAL: "AUSTRAL",
  CREATURE: "Creature",
  INSTANT: "Instant",
  SORCERY: "Sorcery",
  ARTIFACT: "Artifact",
  ENCHANTMENT: "Enchantment",
  LAND: "Land",
  PLANESWALKER: "Planeswalker",
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
] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export function sortAllowedForGame(sort: string, gameSlug: string | undefined): boolean {
  if (sort === "relevance" || sort === "releasedAt" || sort === "price" || sort === "nameAsc" || sort === "nameDesc") {
    return true;
  }
  const def = getGameFilterDefinition(gameSlug);
  return def.filters.some((filter) => filter.sortKey === sort);
}

export function presentAttributeFields(
  gameSlug: string,
  attributes: Record<string, unknown>,
): Array<{ key: string; label: string; value: string }> {
  const def = getGameFilterDefinition(gameSlug);
  const rows: Array<{ key: string; label: string; value: string }> = [];
  for (const field of def.displayFields) {
    const raw = attributes[field.key];
    if (raw == null || raw === "") continue;
    const value = Array.isArray(raw) ? raw.map((item) => String(item)).join(", ") : String(raw);
    if (!value || value === "{}") continue;
    const filter = catalogFilterByKey(def, field.key);
    const display = Array.isArray(raw)
      ? raw.map((item) => (filter ? labelForFilterValue(filter, String(item)) : String(item))).join(", ")
      : filter
        ? labelForFilterValue(filter, value)
        : value;
    rows.push({ key: field.key, label: field.label, value: display });
  }
  return rows;
}
