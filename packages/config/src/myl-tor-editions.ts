/** Official TOR edition slugs (tor.myl.cl cards dropdown). Not a marketplace scrape. */

export const MYL_TOR_FORMATS = ["pe", "pb", "imperio", "fx", "segundo", "lbf"] as const;

export type MylTorFormat = (typeof MYL_TOR_FORMATS)[number];

export function isMylTorFormat(value: string): value is MylTorFormat {
  return (MYL_TOR_FORMATS as readonly string[]).includes(value);
}

export type MylTorEditionRef = {
  slug: string;
  label: string;
  format: MylTorFormat;
};

function list(rows: readonly MylTorEditionRef[]): readonly MylTorEditionRef[] {
  return rows;
}

/** Primera Era (TOR PE dropdown). */
export const MYL_TOR_PE_EDITIONS: readonly MylTorEditionRef[] = list([
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
]);

/** Primer Bloque (TOR PB dropdown). */
export const MYL_TOR_PB_EDITIONS: readonly MylTorEditionRef[] = list([
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
]);

/** Nueva Era / Imperio (TOR IMP dropdowns). Includes current constructed and older Imperio. */
export const MYL_TOR_IMP_EDITIONS: readonly MylTorEditionRef[] = list([
  { slug: "mazo_imp_guerrero", label: "Mazo Guerrero", format: "imperio" },
  { slug: "mazo_imp_eterno", label: "Mazo Eterno", format: "imperio" },
  { slug: "mazo_imp_dragon", label: "Mazo Dragón", format: "imperio" },
  { slug: "ayd_vigilantes", label: "Ángeles y Demonios: Vigilantes", format: "imperio" },
  { slug: "chile_oculto", label: "Chile Oculto", format: "imperio" },
  { slug: "ritual_vudu", label: "Toolkit 2026 - Ritual Vudú", format: "imperio" },
  { slug: "dia_de_muertos", label: "Toolkit 2026 - Día de Muertos", format: "imperio" },
  { slug: "kvsm_titanes", label: "Kaiju vs Mecha - Titanes", format: "imperio" },
  { slug: "libertadores", label: "Libertadores", format: "imperio" },
  { slug: "onyria", label: "Onyria", format: "imperio" },
  { slug: "toolkit_cenizas_de_fuego", label: "Cenizas de Fuego", format: "imperio" },
  { slug: "toolkit_hielo_inmortal", label: "Hielo Inmortal", format: "imperio" },
  { slug: "lootbox_2024", label: "Lootbox 2024", format: "imperio" },
  { slug: "secretos_arcanos", label: "Secretos Arcanos", format: "imperio" },
  { slug: "bestiarium", label: "Bestiarium", format: "imperio" },
  { slug: "escuadronmecha", label: "Escuadrón Mecha", format: "imperio" },
  { slug: "amenazakaiju", label: "Amenaza Kaiju", format: "imperio" },
  { slug: "zodiaco", label: "Zodiaco", format: "imperio" },
  { slug: "espiritu_samurai", label: "Espíritu Samurái", format: "imperio" },
  { slug: "giger", label: "Giger", format: "imperio" },
  { slug: "raciales_imp_2024", label: "Raciales 2024", format: "imperio" },
  { slug: "napoleon", label: "Napoleón", format: "imperio" },
  { slug: "chile_oscuro", label: "Chile Oscuro", format: "imperio" },
  { slug: "visiones_de_kemet", label: "Visiones de Kemet", format: "imperio" },
  { slug: "la_venganza_de_horus", label: "La Venganza de Horus", format: "imperio" },
  { slug: "extension_valhalla", label: "Extensión Valhalla", format: "imperio" },
  { slug: "relatos_del_despertar_gotico", label: "Relatos del Despertar Gótico", format: "imperio" },
  { slug: "neo_midgard", label: "Neo Midgard", format: "imperio" },
  { slug: "valhalla", label: "Valhalla", format: "imperio" },
  { slug: "guardianes_reino_dos", label: "Guardianes del Reino II", format: "imperio" },
  { slug: "guardianes_reino_uno", label: "Guardianes del Reino I", format: "imperio" },
  { slug: "mastertoolkit_2023", label: "Master Toolkit 2023", format: "imperio" },
  { slug: "explorandum", label: "Explorandum", format: "imperio" },
  { slug: "despertar_gotico", label: "Despertar Gótico", format: "imperio" },
  { slug: "master_toolkit_2022", label: "Master Toolkit 2022", format: "imperio" },
  { slug: "coleccion_racial_2022", label: "Colección Racial 2022", format: "imperio" },
  { slug: "cid", label: "CID", format: "imperio" },
  { slug: "cuentos_de_terror_lovecraft", label: "Cuentos de Terror H.P Lovecraft", format: "imperio" },
  { slug: "cuentos_de_terror_poe", label: "Cuentos de Terror Edgar Allan Poe", format: "imperio" },
  { slug: "hermanos_grimm_elaguadelavida_y_johndeacero", label: "Hermanos Grimm El Agua de la Vida y John de Acero", format: "imperio" },
  { slug: "hermanos_grimm_elsastrecillovaliente_y_musicosdebremen", label: "Hermanos Grimm El Sastrecillo Valiente y Los Músicos de Bremen", format: "imperio" },
  { slug: "tinta_inmortal_romeo_y_julieta", label: "Tinta Inmortal Romeo y Julieta", format: "imperio" },
  { slug: "tinta_inmortal_robin_hood", label: "Tinta Inmortal Robin Hood", format: "imperio" },
  { slug: "acero", label: "Acero", format: "imperio" },
  { slug: "escuelas_elementales", label: "Escuelas Elementales", format: "imperio" },
  { slug: "ajedrez", label: "Ajedrez", format: "imperio" },
  { slug: "angeles-demonios", label: "Ángeles y Demonios", format: "imperio" },
  { slug: "conjuros", label: "Conjuros", format: "imperio" },
  { slug: "tierra-austral", label: "Tierra Austral", format: "imperio" },
  { slug: "cuentos-de-ultratumba", label: "Cuentos de Ultratumba", format: "imperio" },
  { slug: "keltoi", label: "Keltoi", format: "imperio" },
  { slug: "hermanos-grimm", label: "Hermanos Grimm", format: "imperio" },
  { slug: "dinastia-del-dragon", label: "Dinastía del Dragón", format: "imperio" },
  { slug: "invasion-oscura", label: "Invasión Oscura", format: "imperio" },
  { slug: "terrores-nocturnos", label: "Terrores Nocturnos", format: "imperio" },
  { slug: "tinta-inmortal", label: "Tinta Inmortal", format: "imperio" },
  { slug: "arsenal", label: "Arsenal", format: "imperio" },
  { slug: "kilimanjaro", label: "Kilimanjaro", format: "imperio" },
  { slug: "calavera", label: "Calavera", format: "imperio" },
  { slug: "olimpia", label: "Olimpia", format: "imperio" },
  { slug: "dharma", label: "Dharma", format: "imperio" },
  { slug: "kemet", label: "Kemet", format: "imperio" },
  { slug: "legado-gotico", label: "Legado Gótico", format: "imperio" },
  { slug: "hijos-del-sol", label: "Hijos Del Sol", format: "imperio" },
  { slug: "axis-mundi", label: "Axis Mundi", format: "imperio" },
  { slug: "steampunk", label: "Steampunk", format: "imperio" },
  { slug: "aguila-imperial", label: "Águila Imperial", format: "imperio" },
  { slug: "contraataque", label: "Contra Ataque", format: "imperio" },
  { slug: "dominio", label: "Dominio", format: "imperio" },
  { slug: "sol-naciente", label: "Sol Naciente", format: "imperio" },
  { slug: "bushido", label: "Bushido", format: "imperio" },
  { slug: "templarios", label: "Templarios", format: "imperio" },
  { slug: "camelot", label: "Camelot", format: "imperio" },
  { slug: "midgard", label: "Midgard", format: "imperio" },
  { slug: "asgard", label: "Asgard", format: "imperio" },
  { slug: "rebelion", label: "Rebelión", format: "imperio" },
  { slug: "sumeria", label: "Sumeria", format: "imperio" },
  { slug: "furiaext", label: "Furia Extension", format: "imperio" },
  { slug: "furia", label: "Furia", format: "imperio" },
]);

/** First Era Extended (TOR FX dropdown). */
export const MYL_TOR_FX_EDITIONS: readonly MylTorEditionRef[] = list([
  { slug: "producto_especial_furia_aniversario", label: "Furia Aniversario FX", format: "fx" },
  { slug: "guardianes_de_daana", label: "Guardianes de Daana FX", format: "fx" },
  { slug: "vigilantes", label: "Vigilantes FX", format: "fx" },
  { slug: "guerreros_del_sol", label: "Guerreros del Sol FX", format: "fx" },
  { slug: "kingdom_quest", label: "Kingdom Quest FX", format: "fx" },
  { slug: "extension_troya", label: "Extensión Troya FX", format: "fx" },
  { slug: "la_cofradia", label: "La Cofradía FX", format: "fx" },
  { slug: "troya", label: "Troya FX", format: "fx" },
  { slug: "extension_excalibur", label: "Extensión Excalibur FX", format: "fx" },
  { slug: "excalibur", label: "Excalibur FX", format: "fx" },
  { slug: "mazos_fx", label: "Mazos FX", format: "fx" },
  { slug: "leyendas_de_metal", label: "Leyendas de Metal FX", format: "fx" },
  { slug: "roma", label: "Roma FX", format: "fx" },
]);

/** Segundo Bloque (TOR 2B dropdown). */
export const MYL_TOR_SEGUNDO_EDITIONS: readonly MylTorEditionRef[] = list([
  { slug: "promocionales_segundo_bloque", label: "Promocionales 2B", format: "segundo" },
  { slug: "leyendas_segundo_bloque", label: "Leyendas 2B", format: "segundo" },
  { slug: "heroes", label: "Héroes", format: "segundo" },
  { slug: "bestiario", label: "Bestiario", format: "segundo" },
  { slug: "hordas", label: "Hordas", format: "segundo" },
  { slug: "reino_de_acero", label: "Reino de Acero", format: "segundo" },
  { slug: "barbarie", label: "Barbarie", format: "segundo" },
  { slug: "vendaval", label: "Vendaval", format: "segundo" },
  { slug: "guerrero_jaguar", label: "Guerrero Jaguar", format: "segundo" },
]);

/** Leyendas Bloque Furia (TOR LBF dropdown). */
export const MYL_TOR_LBF_EDITIONS: readonly MylTorEditionRef[] = list([
  { slug: "leyendas_bloque_furia", label: "Leyendas Bloque Furia", format: "lbf" },
]);

export const MYL_TOR_EDITIONS: readonly MylTorEditionRef[] = [
  ...MYL_TOR_PE_EDITIONS,
  ...MYL_TOR_PB_EDITIONS,
  ...MYL_TOR_IMP_EDITIONS,
  ...MYL_TOR_FX_EDITIONS,
  ...MYL_TOR_SEGUNDO_EDITIONS,
  ...MYL_TOR_LBF_EDITIONS,
];

export function editionsForFormats(formats: readonly MylTorFormat[]): MylTorEditionRef[] {
  const wanted = new Set(formats);
  return MYL_TOR_EDITIONS.filter((row) => wanted.has(row.format));
}

export function findTorEdition(slug: string): MylTorEditionRef | undefined {
  return MYL_TOR_EDITIONS.find((row) => row.slug === slug);
}

export function parseMylTorFormats(raw: string | undefined): MylTorFormat[] {
  const value = (raw ?? "all").trim().toLowerCase();
  if (!value || value === "all") return [...MYL_TOR_FORMATS];
  return value
    .split(",")
    .map((row) => row.trim())
    .filter(isMylTorFormat);
}
