/** Official TOR edition slugs (tor.myl.cl cards dropdown). Not a marketplace scrape. */

export type MylTorFormat = "pe" | "pb" | "imperio";

export const MYL_TOR_FORMATS: readonly MylTorFormat[] = ["pe", "pb", "imperio"];

export function isMylTorFormat(value: string): value is MylTorFormat {
  return (MYL_TOR_FORMATS as readonly string[]).includes(value);
}

export type MylTorEditionRef = {
  slug: string;
  label: string;
  format: MylTorFormat;
};

export const MYL_TOR_PE_EDITIONS: readonly MylTorEditionRef[] = [
  { slug: "xinnian_año_serpiente_2025", label: "Xinnian Año Serpiente 2025", format: "pe" },
  { slug: "toolkit_valentia_y_desolacion", label: "Toolkit Valentía y Desolación", format: "pe" },
  { slug: "toolkit_honor_y_ferocidad", label: "Toolkit Honor y Ferocidad", format: "pe" },
  { slug: "lootbox_pe_2024", label: "Lootbox Primera Era 2024", format: "pe" },
  { slug: "vigilantes_de_la_noche", label: "Vigilantes de la Noche", format: "pe" },
  { slug: "mundos_perdidos_senores_del_trueno", label: "Mundos Perdidos Señores del Trueno", format: "pe" },
  { slug: "mundos_perdidos_viaje_al_oeste", label: "Mundos Perdidos Viaje al Oeste", format: "pe" },
  { slug: "mundos_perdidos_leyendas_de_avalon", label: "Mundos Perdidos Leyendas de Avalon", format: "pe" },
  { slug: "mundos_perdidos_la_saga_de_volsung", label: "Mundos Perdidos La Saga de Volsung", format: "pe" },
  { slug: "mundos_perdidos_ciudad_de_los_cesares", label: "Mundos Perdidos Ciudad de los Césares", format: "pe" },
  { slug: "mundos_perdidos_horrores_de_salem", label: "Mundos Perdidos Horrores de Salem", format: "pe" },
  { slug: "toolkit_justa", label: "Toolkit Justa", format: "pe" },
  { slug: "toolkit_puertas_del_valhalla", label: "Toolkit Puertas del Valhalla", format: "pe" },
  { slug: "xinnian", label: "Xinnian", format: "pe" },
  { slug: "mundo_medieval_el_reto", label: "Mundo Medieval El Reto", format: "pe" },
  { slug: "leyendas_primera_era_2023", label: "Leyendas PE 2023", format: "pe" },
  { slug: "toolkit_odin", label: "Toolkit Odín", format: "pe" },
  { slug: "toolkit_walkirias", label: "Toolkit Walkirias", format: "pe" },
  { slug: "leyendas_primera_era_2022", label: "Leyendas PE 2022", format: "pe" },
  { slug: "eXtension_pe", label: "Extensión", format: "pe" },
  { slug: "raciales_pe", label: "Raciales", format: "pe" },
  { slug: "promocionales_primera_era", label: "Promocionales PE", format: "pe" },
  { slug: "leyendas_primera_era", label: "Leyendas PE", format: "pe" },
  { slug: "espiritu_del_dragon", label: "Espíritu del Dragón", format: "pe" },
  { slug: "cofradia", label: "Cofradía", format: "pe" },
  { slug: "ragnarok", label: "Ragnarok", format: "pe" },
  { slug: "ira_del_nahual", label: "Ira del Nahual", format: "pe" },
  { slug: "mundo_gotico", label: "Mundo Gótico", format: "pe" },
  { slug: "el_reto", label: "El Reto", format: "pe" },
];

export const MYL_TOR_PB_EDITIONS: readonly MylTorEditionRef[] = [
  { slug: "lpb_4.0", label: "Leyendas PB 4.0", format: "pb" },
  { slug: "dante_pb", label: "Inferno: El Camino de Dante", format: "pb" },
  { slug: "shogun_iii", label: "Shogun III", format: "pb" },
  { slug: "daana_aniversario", label: "Hijos de Daana Aniversario", format: "pb" },
  { slug: "relatos_hel_laberinto_del_minotauro", label: "Relatos de Helénica - Laberinto del Minotauro", format: "pb" },
  { slug: "relatos_hel_camino_de_teseo", label: "Relatos de Helénica - Caminos de Teseo", format: "pb" },
  { slug: "relatos_hel_mar_de_poseidon", label: "Relatos de Helénica - Mar de Poseidón", format: "pb" },
  { slug: "toolkit_pb_magia_y_divinidad", label: "Toolkit Magia y Divinidad", format: "pb" },
  { slug: "toolkit_pb_fuerza_y_destino", label: "Toolkit Fuerza y Destino", format: "pb" },
  { slug: "leyendas_pb_3.0", label: "Leyendas 3.0", format: "pb" },
  { slug: "pb_lootbox_2023", label: "LootBox 2023", format: "pb" },
  { slug: "dracula_pb", label: "Drácula", format: "pb" },
  { slug: "shogun_ii", label: "Shogun II", format: "pb" },
  { slug: "helenica_aniversario", label: "Helénica Aniversario", format: "pb" },
  { slug: "colecciones_raciales_pb_2023", label: "Colecciones Raciales PB 2023", format: "pb" },
  { slug: "relatos_espada_sagrada_aniversario", label: "Relatos Espada Sagrada Aniversario", format: "pb" },
  { slug: "espada_sagrada_aniversario", label: "Espada Sagrada Aniversario", format: "pb" },
  { slug: "extensiones_pb_2023", label: "Extensiones Primer Bloque 2023", format: "pb" },
  { slug: "toolkit_fe_sin_limite", label: "Toolkit Fe sin Límite", format: "pb" },
  { slug: "toolkit_dragon_dorado", label: "Toolkit Dragón Dorado", format: "pb" },
  { slug: "primer_bloque_2", label: "Leyendas 2.0", format: "pb" },
  { slug: "shogun_1", label: "Shogun", format: "pb" },
  { slug: "raciales_pb", label: "Raciales", format: "pb" },
  { slug: "promocionales_primer_bloque", label: "Promocionales PB", format: "pb" },
  { slug: "leyendas_primer_bloque", label: "Leyendas PB", format: "pb" },
  { slug: "encrucijada", label: "Encrucijada", format: "pb" },
  { slug: "dominios-de-ra", label: "Dominios de Ra", format: "pb" },
  { slug: "tierras_altas", label: "Tierras Altas", format: "pb" },
  { slug: "hijos_de_daana", label: "Hijos de Daana", format: "pb" },
  { slug: "imperio", label: "Imperio", format: "pb" },
  { slug: "helenica", label: "Helénica", format: "pb" },
  { slug: "cruzadas", label: "Cruzadas", format: "pb" },
  { slug: "espada-sagrada", label: "Espada Sagrada", format: "pb" },
];

/** TOR Imperio-era editions. Default importer stays PE+PB; use `--formats imperio` or `--edition`. */
export const MYL_TOR_IMP_EDITIONS: readonly MylTorEditionRef[] = [
  { slug: "aguila-imperial", label: "Águila Imperial", format: "imperio" },
  { slug: "tierra-austral", label: "Tierra Austral", format: "imperio" },
];

export const MYL_TOR_EDITIONS: readonly MylTorEditionRef[] = [
  ...MYL_TOR_PE_EDITIONS,
  ...MYL_TOR_PB_EDITIONS,
  ...MYL_TOR_IMP_EDITIONS,
];

export function editionsForFormats(formats: readonly MylTorFormat[]): MylTorEditionRef[] {
  const wanted = new Set(formats);
  return MYL_TOR_EDITIONS.filter((row) => wanted.has(row.format));
}

export function findTorEdition(slug: string): MylTorEditionRef | undefined {
  return MYL_TOR_EDITIONS.find((row) => row.slug === slug);
}
