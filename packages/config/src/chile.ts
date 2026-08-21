export const SHIPPING_ZONES = ["RM", "REGIONS"] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];

export type ChileRegion = {
  name: string;
  zone: ShippingZone;
  comunas: readonly string[];
};

/** Catálogo normalizado de regiones y comunas de Chile (MVP, sin Google Places). */
export const CHILE_REGIONS: readonly ChileRegion[] = [
  {
    name: "Arica y Parinacota",
    zone: "REGIONS",
    comunas: ["Arica", "Camarones", "Putre", "General Lagos"],
  },
  {
    name: "Tarapacá",
    zone: "REGIONS",
    comunas: ["Iquique", "Alto Hospicio", "Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"],
  },
  {
    name: "Antofagasta",
    zone: "REGIONS",
    comunas: [
      "Antofagasta",
      "Mejillones",
      "Sierra Gorda",
      "Taltal",
      "Calama",
      "Ollagüe",
      "San Pedro de Atacama",
      "Tocopilla",
      "María Elena",
    ],
  },
  {
    name: "Atacama",
    zone: "REGIONS",
    comunas: [
      "Copiapó",
      "Caldera",
      "Tierra Amarilla",
      "Chañaral",
      "Diego de Almagro",
      "Vallenar",
      "Alto del Carmen",
      "Freirina",
      "Huasco",
    ],
  },
  {
    name: "Coquimbo",
    zone: "REGIONS",
    comunas: [
      "La Serena",
      "Coquimbo",
      "Andacollo",
      "La Higuera",
      "Paiguano",
      "Vicuña",
      "Illapel",
      "Canela",
      "Los Vilos",
      "Salamanca",
      "Ovalle",
      "Combarbalá",
      "Monte Patria",
      "Punitaqui",
      "Río Hurtado",
    ],
  },
  {
    name: "Valparaíso",
    zone: "REGIONS",
    comunas: [
      "Valparaíso",
      "Casablanca",
      "Concón",
      "Juan Fernández",
      "Puchuncaví",
      "Quintero",
      "Viña del Mar",
      "Isla de Pascua",
      "Los Andes",
      "Calle Larga",
      "Rinconada",
      "San Esteban",
      "La Ligua",
      "Cabildo",
      "Papudo",
      "Petorca",
      "Zapallar",
      "Quillota",
      "Calera",
      "Hijuelas",
      "La Cruz",
      "Nogales",
      "San Antonio",
      "Algarrobo",
      "Cartagena",
      "El Quisco",
      "El Tabo",
      "Santo Domingo",
      "San Felipe",
      "Catemu",
      "Llaillay",
      "Panquehue",
      "Putaendo",
      "Santa María",
      "Quilpué",
      "Limache",
      "Olmué",
      "Villa Alemana",
    ],
  },
  {
    name: "Metropolitana de Santiago",
    zone: "RM",
    comunas: [
      "Cerrillos",
      "Cerro Navia",
      "Conchalí",
      "El Bosque",
      "Estación Central",
      "Huechuraba",
      "Independencia",
      "La Cisterna",
      "La Florida",
      "La Granja",
      "La Pintana",
      "La Reina",
      "Las Condes",
      "Lo Barnechea",
      "Lo Espejo",
      "Lo Prado",
      "Macul",
      "Maipú",
      "Ñuñoa",
      "Pedro Aguirre Cerda",
      "Peñalolén",
      "Providencia",
      "Pudahuel",
      "Quilicura",
      "Quinta Normal",
      "Recoleta",
      "Renca",
      "San Joaquín",
      "San Miguel",
      "San Ramón",
      "Santiago",
      "Vitacura",
      "Puente Alto",
      "Pirque",
      "San José de Maipo",
      "Colina",
      "Lampa",
      "Tiltil",
      "San Bernardo",
      "Buin",
      "Calera de Tango",
      "Paine",
      "Melipilla",
      "Alhué",
      "Curacaví",
      "María Pinto",
      "San Pedro",
      "Talagante",
      "El Monte",
      "Isla de Maipo",
      "Padre Hurtado",
      "Peñaflor",
    ],
  },
  {
    name: "O'Higgins",
    zone: "REGIONS",
    comunas: [
      "Rancagua",
      "Codegua",
      "Coinco",
      "Coltauco",
      "Doñihue",
      "Graneros",
      "Las Cabras",
      "Machalí",
      "Malloa",
      "Mostazal",
      "Olivar",
      "Peumo",
      "Pichidegua",
      "Quinta de Tilcoco",
      "Rengo",
      "Requínoa",
      "San Vicente",
      "Pichilemu",
      "La Estrella",
      "Litueche",
      "Marchihue",
      "Navidad",
      "Paredones",
      "San Fernando",
      "Chépica",
      "Chimbarongo",
      "Lolol",
      "Nancagua",
      "Palmilla",
      "Peralillo",
      "Placilla",
      "Pumanque",
      "Santa Cruz",
    ],
  },
  {
    name: "Maule",
    zone: "REGIONS",
    comunas: [
      "Talca",
      "Constitución",
      "Curepto",
      "Empedrado",
      "Maule",
      "Pelarco",
      "Pencahue",
      "Río Claro",
      "San Clemente",
      "San Rafael",
      "Cauquenes",
      "Chanco",
      "Pelluhue",
      "Curicó",
      "Hualañé",
      "Licantén",
      "Molina",
      "Rauco",
      "Romeral",
      "Sagrada Familia",
      "Teno",
      "Vichuquén",
      "Linares",
      "Colbún",
      "Longaví",
      "Parral",
      "Retiro",
      "San Javier",
      "Villa Alegre",
      "Yerbas Buenas",
    ],
  },
  {
    name: "Ñuble",
    zone: "REGIONS",
    comunas: [
      "Chillán",
      "Bulnes",
      "Chillán Viejo",
      "El Carmen",
      "Pemuco",
      "Pinto",
      "Quillón",
      "San Ignacio",
      "Yungay",
      "Quirihue",
      "Cobquecura",
      "Coelemu",
      "Ninhue",
      "Portezuelo",
      "Ránquil",
      "Treguaco",
      "San Carlos",
      "Coihueco",
      "Ñiquén",
      "San Fabián",
      "San Nicolás",
    ],
  },
  {
    name: "Biobío",
    zone: "REGIONS",
    comunas: [
      "Concepción",
      "Coronel",
      "Chiguayante",
      "Florida",
      "Hualqui",
      "Lota",
      "Penco",
      "San Pedro de la Paz",
      "Santa Juana",
      "Talcahuano",
      "Tomé",
      "Hualpén",
      "Lebu",
      "Arauco",
      "Cañete",
      "Contulmo",
      "Curanilahue",
      "Los Álamos",
      "Tirúa",
      "Los Ángeles",
      "Antuco",
      "Cabrero",
      "Laja",
      "Mulchén",
      "Nacimiento",
      "Negrete",
      "Quilleco",
      "San Rosendo",
      "Santa Bárbara",
      "Tucapel",
      "Yumbel",
      "Alto Biobío",
    ],
  },
  {
    name: "La Araucanía",
    zone: "REGIONS",
    comunas: [
      "Temuco",
      "Carahue",
      "Cunco",
      "Curarrehue",
      "Freire",
      "Galvarino",
      "Gorbea",
      "Lautaro",
      "Loncoche",
      "Melipeuco",
      "Nueva Imperial",
      "Padre Las Casas",
      "Perquenco",
      "Pitrufquén",
      "Pucón",
      "Saavedra",
      "Teodoro Schmidt",
      "Toltén",
      "Vilcún",
      "Villarrica",
      "Cholchol",
      "Angol",
      "Collipulli",
      "Curacautín",
      "Ercilla",
      "Lonquimay",
      "Los Sauces",
      "Lumaco",
      "Purén",
      "Renaico",
      "Traiguén",
      "Victoria",
    ],
  },
  {
    name: "Los Ríos",
    zone: "REGIONS",
    comunas: [
      "Valdivia",
      "Corral",
      "Lanco",
      "Los Lagos",
      "Máfil",
      "Mariquina",
      "Paillaco",
      "Panguipulli",
      "La Unión",
      "Futrono",
      "Lago Ranco",
      "Río Bueno",
    ],
  },
  {
    name: "Los Lagos",
    zone: "REGIONS",
    comunas: [
      "Puerto Montt",
      "Calbuco",
      "Cochamó",
      "Fresia",
      "Frutillar",
      "Los Muermos",
      "Llanquihue",
      "Maullín",
      "Puerto Varas",
      "Castro",
      "Ancud",
      "Chonchi",
      "Curaco de Vélez",
      "Dalcahue",
      "Puqueldón",
      "Queilén",
      "Quellón",
      "Quemchi",
      "Quinchao",
      "Osorno",
      "Puerto Octay",
      "Purranque",
      "Puyehue",
      "Río Negro",
      "San Juan de la Costa",
      "San Pablo",
      "Chaitén",
      "Futaleufú",
      "Hualaihué",
      "Palena",
    ],
  },
  {
    name: "Aysén",
    zone: "REGIONS",
    comunas: [
      "Coyhaique",
      "Lago Verde",
      "Aysén",
      "Cisnes",
      "Guaitecas",
      "Cochrane",
      "O'Higgins",
      "Tortel",
      "Chile Chico",
      "Río Ibáñez",
    ],
  },
  {
    name: "Magallanes",
    zone: "REGIONS",
    comunas: [
      "Punta Arenas",
      "Laguna Blanca",
      "Río Verde",
      "San Gregorio",
      "Cabo de Hornos",
      "Antártica",
      "Porvenir",
      "Primavera",
      "Timaukel",
      "Natales",
      "Torres del Paine",
    ],
  },
] as const;

export type ChilePlace = {
  comuna: string;
  region: string;
  zone: ShippingZone;
};

function foldChileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COMUNA_INDEX: ReadonlyMap<string, ChilePlace> = (() => {
  const map = new Map<string, ChilePlace>();
  for (const region of CHILE_REGIONS) {
    for (const comuna of region.comunas) {
      map.set(foldChileName(comuna), { comuna, region: region.name, zone: region.zone });
    }
  }
  return map;
})();

const REGION_ALIASES: ReadonlyMap<string, ChileRegion> = (() => {
  const map = new Map<string, ChileRegion>();
  for (const region of CHILE_REGIONS) {
    map.set(foldChileName(region.name), region);
  }
  const rm = CHILE_REGIONS.find((row) => row.zone === "RM");
  if (rm) {
    for (const alias of ["rm", "metropolitana", "region metropolitana", "santiago"]) {
      map.set(alias, rm);
    }
  }
  const ohiggins = CHILE_REGIONS.find((row) => row.name === "O'Higgins");
  if (ohiggins) {
    map.set(foldChileName("Libertador General Bernardo O'Higgins"), ohiggins);
    map.set("sexta", ohiggins);
  }
  return map;
})();

export function findChilePlace(comuna: string, region?: string | null): ChilePlace | null {
  const fromComuna = COMUNA_INDEX.get(foldChileName(comuna));
  if (fromComuna) {
    return fromComuna;
  }
  if (!region) {
    return null;
  }
  const fromRegion = REGION_ALIASES.get(foldChileName(region));
  if (!fromRegion) {
    return null;
  }
  return { comuna: comuna.trim(), region: fromRegion.name, zone: fromRegion.zone };
}

export function shippingZoneFromPlace(comuna: string, region?: string | null): ShippingZone | null {
  return findChilePlace(comuna, region)?.zone ?? null;
}
