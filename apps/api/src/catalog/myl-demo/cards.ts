/** Compact MyL demo catalog. Names/editions are well-known Primera Era / Imperio cards.
 * Stats (coste/fuerza/raza) only when already present in reference fixtures — otherwise omitted.
 * Not a marketplace scrape. Not synthetic-showcase (must remain visible with SHOW_SYNTHETIC_CATALOG=false).
 */
export type MylDemoCardType = "ALIADO" | "TALISMAN" | "TOTEM" | "ARMA" | "ORO";

export type MylDemoSet = {
  code: string;
  slug: string;
  name: string;
  edicion: string;
  era: string;
};

export type MylDemoCard = {
  set: MylDemoSet;
  name: string;
  rarity: string;
  cardType: MylDemoCardType;
  raza?: string;
  coste?: number;
  fuerza?: number;
};

export const MYL_DEMO_SETS = {
  es: { code: "ES", slug: "espada-sagrada", name: "Espada Sagrada", edicion: "ESPADA_SAGRADA", era: "PRIMERA_ERA" },
  he: { code: "HE", slug: "helenica", name: "Helénica", edicion: "HELENICA", era: "PRIMERA_ERA" },
  dr: { code: "DR", slug: "dominios-de-ra", name: "Dominios de Ra", edicion: "DOMINIOS_DE_RA", era: "PRIMERA_ERA" },
  ai: { code: "AI", slug: "aguila-imperial", name: "Águila Imperial", edicion: "AGUILA_IMPERIAL", era: "IMPERIO" },
  co: { code: "CO", slug: "la-cofradia", name: "La Cofradía", edicion: "LA_COFRADIA", era: "PRIMERA_ERA" },
  ta: { code: "TA", slug: "tierra-austral", name: "Tierra Austral", edicion: "TIERRA_AUSTRAL", era: "IMPERIO" },
} as const satisfies Record<string, MylDemoSet>;

type Row = [keyof typeof MYL_DEMO_SETS, string, string, MylDemoCardType];

/** ~140 named cards across 7 editions. Reference fixtures (Mitra, Excalibur, …) are also upserted by seed. */
const ROWS: Row[] = [
  ["es", "Arturo", "Ultra Real", "ALIADO"],
  ["es", "Merlín", "Ultra Real", "ALIADO"],
  ["es", "Lancelot", "Real", "ALIADO"],
  ["es", "Galahad", "Real", "ALIADO"],
  ["es", "Percival", "Real", "ALIADO"],
  ["es", "Gawain", "Cortesano", "ALIADO"],
  ["es", "Kay", "Cortesano", "ALIADO"],
  ["es", "Bedivere", "Cortesano", "ALIADO"],
  ["es", "Mordred", "Real", "ALIADO"],
  ["es", "Morgana", "Ultra Real", "ALIADO"],
  ["es", "Ginebra", "Real", "ALIADO"],
  ["es", "Nimue", "Real", "ALIADO"],
  ["es", "Uther", "Real", "ALIADO"],
  ["es", "Tristán", "Real", "ALIADO"],
  ["es", "Iseo", "Cortesano", "ALIADO"],
  ["es", "Balin", "Cortesano", "ALIADO"],
  ["es", "Balan", "Cortesano", "ALIADO"],
  ["es", "Agravain", "Cortesano", "ALIADO"],
  ["es", "Gareth", "Cortesano", "ALIADO"],
  ["es", "Gaheris", "Cortesano", "ALIADO"],
  ["es", "Dama del Lago", "Real", "ALIADO"],
  ["es", "Camelot", "Real", "TOTEM"],
  ["es", "Mesa Redonda", "Real", "TOTEM"],
  ["es", "Caliburn", "Real", "ARMA"],
  ["es", "Lanza de Longinus", "Ultra Real", "ARMA"],
  ["es", "Grial", "Ultra Real", "TALISMAN"],
  ["es", "Avalon", "Real", "TALISMAN"],
  ["he", "Zeus", "Ultra Real", "ALIADO"],
  ["he", "Hera", "Real", "ALIADO"],
  ["he", "Poseidón", "Ultra Real", "ALIADO"],
  ["he", "Hades", "Ultra Real", "ALIADO"],
  ["he", "Atenea", "Ultra Real", "ALIADO"],
  ["he", "Ares", "Real", "ALIADO"],
  ["he", "Afrodita", "Real", "ALIADO"],
  ["he", "Apolo", "Real", "ALIADO"],
  ["he", "Artemisa", "Real", "ALIADO"],
  ["he", "Hermes", "Real", "ALIADO"],
  ["he", "Hefesto", "Real", "ALIADO"],
  ["he", "Dionisio", "Cortesano", "ALIADO"],
  ["he", "Deméter", "Real", "ALIADO"],
  ["he", "Perséfone", "Real", "ALIADO"],
  ["he", "Hestia", "Cortesano", "ALIADO"],
  ["he", "Perseo", "Real", "ALIADO"],
  ["he", "Medusa", "Real", "ALIADO"],
  ["he", "Minotauro", "Real", "ALIADO"],
  ["he", "Hidra", "Real", "ALIADO"],
  ["he", "Pegaso", "Real", "ALIADO"],
  ["he", "Aquiles", "Ultra Real", "ALIADO"],
  ["he", "Héctor", "Real", "ALIADO"],
  ["he", "Ulises", "Real", "ALIADO"],
  ["he", "Helena", "Real", "ALIADO"],
  ["he", "Paris", "Cortesano", "ALIADO"],
  ["he", "Áyax", "Cortesano", "ALIADO"],
  ["he", "Jasón", "Real", "ALIADO"],
  ["he", "Heracles", "Ultra Real", "ALIADO"],
  ["he", "Teseo", "Real", "ALIADO"],
  ["he", "Orfeo", "Cortesano", "ALIADO"],
  ["he", "Cronos", "Ultra Real", "ALIADO"],
  ["he", "Prometeo", "Real", "ALIADO"],
  ["he", "Pandora", "Real", "ALIADO"],
  ["he", "Ícaro", "Cortesano", "ALIADO"],
  ["he", "Cerbero", "Real", "ALIADO"],
  ["he", "Olimpo", "Real", "TOTEM"],
  ["he", "Tridente", "Real", "ARMA"],
  ["he", "Égida", "Real", "ARMA"],
  ["he", "Rayo de Zeus", "Ultra Real", "TALISMAN"],
  ["dr", "Ra", "Ultra Real", "ALIADO"],
  ["dr", "Atón", "Ultra Real", "ALIADO"],
  ["dr", "Amón", "Real", "ALIADO"],
  ["dr", "Anubis", "Ultra Real", "ALIADO"],
  ["dr", "Osiris", "Ultra Real", "ALIADO"],
  ["dr", "Isis", "Real", "ALIADO"],
  ["dr", "Horus", "Ultra Real", "ALIADO"],
  ["dr", "Seth", "Ultra Real", "ALIADO"],
  ["dr", "Thot", "Real", "ALIADO"],
  ["dr", "Bastet", "Real", "ALIADO"],
  ["dr", "Sobek", "Real", "ALIADO"],
  ["dr", "Hathor", "Cortesano", "ALIADO"],
  ["dr", "Nephthys", "Cortesano", "ALIADO"],
  ["dr", "Ptah", "Real", "ALIADO"],
  ["dr", "Sekhmet", "Real", "ALIADO"],
  ["dr", "Khepri", "Cortesano", "ALIADO"],
  ["dr", "Apofis", "Ultra Real", "ALIADO"],
  ["dr", "Esfinge", "Real", "ALIADO"],
  ["dr", "Escarabajo", "Cortesano", "ORO"],
  ["dr", "Pirámide", "Real", "TOTEM"],
  ["dr", "Nilo", "Real", "TOTEM"],
  ["dr", "Cetro de Ra", "Ultra Real", "ARMA"],
  ["dr", "Ojo de Horus", "Ultra Real", "TALISMAN"],
  ["dr", "Libro de los Muertos", "Real", "TALISMAN"],
  ["ai", "Ahura Mazda", "Ultra Real", "ALIADO"],
  ["ai", "Ahriman", "Ultra Real", "ALIADO"],
  ["ai", "Zoroastro", "Real", "ALIADO"],
  ["ai", "Ciro", "Real", "ALIADO"],
  ["ai", "Darío", "Real", "ALIADO"],
  ["ai", "Jerjes", "Real", "ALIADO"],
  ["ai", "Anahita", "Real", "ALIADO"],
  ["ai", "Inmortal", "Cortesano", "ALIADO"],
  ["ai", "Magi", "Cortesano", "ALIADO"],
  ["ai", "Persépolis", "Real", "TOTEM"],
  ["ai", "Fuego Sagrado", "Real", "TALISMAN"],
  ["co", "Templario", "Real", "ALIADO"],
  ["co", "Hospitalario", "Cortesano", "ALIADO"],
  ["co", "Gran Maestre", "Ultra Real", "ALIADO"],
  ["co", "Cruzado", "Cortesano", "ALIADO"],
  ["co", "Inquisidor", "Real", "ALIADO"],
  ["co", "Cátaro", "Cortesano", "ALIADO"],
  ["co", "Hereje", "Cortesano", "ALIADO"],
  ["co", "Jerusalén", "Real", "TOTEM"],
  ["co", "Cruz", "Cortesano", "TALISMAN"],
  ["ta", "Lautaro", "Ultra Real", "ALIADO"],
  ["ta", "Caupolicán", "Ultra Real", "ALIADO"],
  ["ta", "Colo Colo", "Real", "ALIADO"],
  ["ta", "Michimalonco", "Real", "ALIADO"],
  ["ta", "Fresia", "Real", "ALIADO"],
  ["ta", "Galvarino", "Real", "ALIADO"],
  ["ta", "Janequeo", "Real", "ALIADO"],
  ["ta", "Pelantaro", "Cortesano", "ALIADO"],
  ["ta", "Toqui", "Cortesano", "ALIADO"],
  ["ta", "Kultrún", "Real", "TALISMAN"],
  ["ta", "Clava", "Cortesano", "ARMA"],
];

export const MYL_DEMO_CARDS: MylDemoCard[] = ROWS.map(([setKey, name, rarity, cardType]) => ({
  set: MYL_DEMO_SETS[setKey],
  name,
  rarity,
  cardType,
}));
