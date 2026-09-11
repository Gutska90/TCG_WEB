/** MyL edition slug → era for the game hub. Keys are hyphen-folded TOR/DB slugs. */

export const MYL_SET_ERAS = ["pe", "pb", "imperio", "other"] as const;
export type MylSetEra = (typeof MYL_SET_ERAS)[number];

export const MYL_SET_ERA_LABELS: Record<MylSetEra, string> = {
  pe: "Primera Era",
  pb: "Primer Bloque",
  imperio: "Imperio",
  other: "Otras ediciones",
};

const PE = [
  "xinnian-ano-serpiente-2025",
  "toolkit-valentia-y-desolacion",
  "toolkit-honor-y-ferocidad",
  "lootbox-pe-2024",
  "vigilantes-de-la-noche",
  "mundos-perdidos-senores-del-trueno",
  "mundos-perdidos-viaje-al-oeste",
  "mundos-perdidos-leyendas-de-avalon",
  "mundos-perdidos-la-saga-de-volsung",
  "mundos-perdidos-ciudad-de-los-cesares",
  "mundos-perdidos-horrores-de-salem",
  "toolkit-justa",
  "toolkit-puertas-del-valhalla",
  "xinnian",
  "mundo-medieval-el-reto",
  "leyendas-primera-era-2023",
  "lpe-2023",
  "toolkit-odin",
  "toolkit-walkirias",
  "leyendas-primera-era-2022",
  "extension-pe",
  "extensiones-pe",
  "raciales-pe",
  "promocionales-primera-era",
  "pe-promocionales-pe",
  "leyendas-primera-era",
  "espiritu-del-dragon",
  "cofradia",
  "ragnarok",
  "ira-del-nahual",
  "mundo-gotico",
  "el-reto",
];

const PB = [
  "lpb-4-0",
  "dante-pb",
  "shogun-iii",
  "daana-aniversario",
  "relatos-hel-laberinto-del-minotauro",
  "relatos-hel-camino-de-teseo",
  "relatos-hel-mar-de-poseidon",
  "toolkit-pb-magia-y-divinidad",
  "pb-toolkit-magia-y-divinidad",
  "toolkit-pb-fuerza-y-destino",
  "leyendas-pb-3-0",
  "primer-bloque-2-0",
  "pb-lootbox-2023",
  "dracula-pb",
  "dracula",
  "shogun-ii",
  "helenica-aniversario",
  "colecciones-raciales-pb-2023",
  "relatos-espada-sagrada-aniversario",
  "espada-sagrada-aniversario",
  "extensiones-pb-2023",
  "toolkit-fe-sin-limite",
  "toolkit-dragon-dorado",
  "promocionales-pb",
  "primer-bloque-2",
  "shogun-1",
  "shogun",
  "raciales-pb",
  "promocionales-primer-bloque",
  "leyendas-primer-bloque",
  "encrucijada",
  "dominios-de-ra",
  "tierras-altas",
  "hijos-de-daana",
  "imperio",
  "helenica",
  "cruzadas",
  "espada-sagrada",
];

const IMPERIO = ["aguila-imperial", "tierra-austral"];

function foldSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, "-")
    .replace(/\./g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const ERA_BY_SLUG: Record<string, Exclude<MylSetEra, "other">> = {
  ...Object.fromEntries(PE.map((slug) => [slug, "pe" as const])),
  ...Object.fromEntries(PB.map((slug) => [slug, "pb" as const])),
  ...Object.fromEntries(IMPERIO.map((slug) => [slug, "imperio" as const])),
};

export function mylSetEra(slug: string): MylSetEra {
  return ERA_BY_SLUG[foldSlug(slug)] ?? "other";
}
