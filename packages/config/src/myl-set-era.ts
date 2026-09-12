/** MyL edition slug → era for the game hub. Keys are hyphen-folded TOR/DB slugs. */

import { MYL_TOR_EDITIONS, type MylTorFormat } from "./myl-tor-editions";

export const MYL_SET_ERAS = ["pe", "pb", "segundo", "fx", "imperio", "lbf", "other"] as const;
export type MylSetEra = (typeof MYL_SET_ERAS)[number];

export const MYL_SET_ERA_LABELS: Record<MylSetEra, string> = {
  pe: "Primera Era",
  pb: "Primer Bloque",
  segundo: "Segundo Bloque",
  fx: "FX",
  imperio: "Imperio",
  lbf: "Leyendas Bloque Furia",
  other: "Otras ediciones",
};

const FORMAT_TO_ERA: Record<MylTorFormat, Exclude<MylSetEra, "other">> = {
  pe: "pe",
  pb: "pb",
  segundo: "segundo",
  fx: "fx",
  imperio: "imperio",
  lbf: "lbf",
};

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

/** Older DB slugs that do not match the live TOR request slug after folding. */
const SLUG_ALIASES: Record<string, Exclude<MylSetEra, "other">> = {
  "lpe-2023": "pe",
  "extension-pe": "pe",
  "extensiones-pe": "pe",
  "pe-promocionales-pe": "pe",
  "pb-toolkit-magia-y-divinidad": "pb",
  "primer-bloque-2-0": "pb",
  "promocionales-pb": "pb",
  dracula: "pb",
  shogun: "pb",
};

const ERA_BY_SLUG: Record<string, Exclude<MylSetEra, "other">> = {
  ...Object.fromEntries(MYL_TOR_EDITIONS.map((row) => [foldSlug(row.slug), FORMAT_TO_ERA[row.format]])),
  ...SLUG_ALIASES,
};

export function mylSetEra(slug: string): MylSetEra {
  return ERA_BY_SLUG[foldSlug(slug)] ?? "other";
}
