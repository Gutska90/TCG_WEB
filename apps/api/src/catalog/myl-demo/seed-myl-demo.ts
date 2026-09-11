import { LEGAL, isSyntheticCardAttributes } from "@tcg/config";
import type { CardCondition, PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { seedReferenceCatalog } from "../reference-catalog/seed";
import { importMylDemoCards } from "./import-myl";
import { importMylTorCatalog } from "../myl-tor/import-myl-tor";

export const MYL_DEMO_SELLERS = [
  {
    email: "myl.store.providencia@example.test",
    password: "MylDemoPassw0rd!",
    displayName: "Mitos Store",
    slug: "mitos-store",
    comuna: "Providencia",
    region: "Metropolitana de Santiago",
    bio: "Tienda demo de Mitos y Leyendas. Precios de vitrina, no son cotizaciones reales.",
    contactWhatsapp: "+56959182596",
    contactWhatsappEnabled: true,
  },
  {
    email: "cartas.valparaiso.myl@example.test",
    password: "MylDemoPassw0rd!",
    displayName: "Cartas Valparaíso",
    slug: "cartas-valparaiso",
    comuna: "Valparaíso",
    region: "Valparaíso",
    bio: "Vendedor demo. Stock y precios para mostrar el marketplace.",
    contactWhatsapp: null,
    contactWhatsappEnabled: false,
  },
  {
    email: "mazo.nunoa.myl@example.test",
    password: "MylDemoPassw0rd!",
    displayName: "Mazo Ñuñoa",
    slug: "mazo-nunoa",
    comuna: "Ñuñoa",
    region: "Metropolitana de Santiago",
    bio: "Coleccionista demo. Publicaciones de ejemplo en NM, LP y MP.",
    contactWhatsapp: null,
    contactWhatsappEnabled: false,
  },
  {
    email: "imperio.tcg.demo@example.test",
    password: "MylDemoPassw0rd!",
    displayName: "Imperio TCG",
    slug: "imperio-tcg",
    comuna: "Santiago",
    region: "Metropolitana de Santiago",
    bio: "Vendedor demo. Inventario de ejemplo para comparar ofertas.",
    contactWhatsapp: null,
    contactWhatsappEnabled: false,
  },
  {
    email: "cartas.del.sur.demo@example.test",
    password: "MylDemoPassw0rd!",
    displayName: "Cartas del Sur",
    slug: "cartas-del-sur",
    comuna: "Concepción",
    region: "Biobío",
    bio: "Tienda demo del sur. Contacto público deshabilitado.",
    contactWhatsapp: null,
    contactWhatsappEnabled: false,
  },
] as const;

const DEMO_LISTING_SET_SLUGS = new Set([
  "espada-sagrada",
  "helenica",
  "dominios-de-ra",
  "el-reto",
  "mundo-gotico",
  "cruzadas",
  "cofradia",
]);
const DEMO_LISTING_CAP = 250;

const CONDITIONS: CardCondition[][] = [
  ["NM", "NM", "LP"],
  ["LP", "NM", "MP"],
  ["NM", "LP", "NM"],
  ["NM", "LP", "MP"],
  ["LP", "MP", "NM"],
];

function priceFor(rarity: string, sellerIndex: number, cardIndex: number): number {
  const base =
    /ultra/i.test(rarity) ? 18_000 : /real/i.test(rarity) ? 7_500 : /cortesano/i.test(rarity) ? 2_200 : 3_500;
  const jitter = ((cardIndex * 17 + sellerIndex * 41) % 9) * 250;
  const markup = sellerIndex === 0 ? 0 : sellerIndex === 1 ? 1_200 : 700;
  return base + jitter + markup;
}

async function upsertSeller(
  prisma: PrismaClient,
  input: (typeof MYL_DEMO_SELLERS)[number],
): Promise<{ id: string }> {
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      displayName: input.displayName,
      slug: input.slug,
      emailVerifiedAt: now,
      termsVersion: LEGAL.termsVersion,
      privacyVersion: LEGAL.privacyVersion,
      acceptedAt: now,
      isBanned: false,
      deletedAt: null,
    },
    create: {
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      slug: input.slug,
      emailVerifiedAt: now,
      termsVersion: LEGAL.termsVersion,
      privacyVersion: LEGAL.privacyVersion,
      acceptedAt: now,
    },
  });
  for (const role of ["USER", "SELLER"] as const) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      sellerOnboardedAt: now,
      comuna: input.comuna,
      region: input.region,
      country: "CL",
      bio: input.bio,
      contactWhatsapp: input.contactWhatsapp,
      contactWhatsappEnabled: input.contactWhatsappEnabled,
    },
    create: {
      userId: user.id,
      country: "CL",
      comuna: input.comuna,
      region: input.region,
      bio: input.bio,
      sellerOnboardedAt: now,
      contactWhatsapp: input.contactWhatsapp,
      contactWhatsappEnabled: input.contactWhatsappEnabled,
    },
  });
  return user;
}

async function upsertListing(
  prisma: PrismaClient,
  input: {
    sellerId: string;
    variantId: string;
    title: string;
    condition: CardCondition;
    quantity: number;
    priceClp: number;
  },
): Promise<void> {
  const existing = await prisma.listing.findFirst({
    where: {
      sellerId: input.sellerId,
      variantId: input.variantId,
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    await prisma.listing.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        condition: input.condition,
        quantity: Math.max(existing.quantity, input.quantity),
        priceClp: input.priceClp,
        status: "ACTIVE",
        description: "Publicación demo de Mitos y Leyendas. No es un precio de mercado real.",
      },
    });
    return;
  }
  await prisma.listing.create({
    data: {
      sellerId: input.sellerId,
      variantId: input.variantId,
      productType: "SINGLE",
      title: input.title,
      condition: input.condition,
      quantity: input.quantity,
      priceClp: input.priceClp,
      status: "ACTIVE",
      description: "Publicación demo de Mitos y Leyendas. No es un precio de mercado real.",
      allowsMeetup: true,
      allowsShipping: true,
      publishedAt: new Date(),
    },
  });
}

export async function seedMylDemo(prisma: PrismaClient): Promise<{
  cards: number;
  sellers: number;
  listings: number;
}> {
  const reference = await seedReferenceCatalog(prisma);
  let imported = { cards: 0 };
  if (process.env.MYL_TOR_LIVE_IMPORT === "true") {
    try {
      imported = await importMylTorCatalog(prisma, { formats: ["pe", "pb"] });
    } catch (error) {
      console.error("Importador TOR (api.myl.cl) no disponible; se usa el pack demo local.", error);
    }
  }
  if (imported.cards === 0) {
    const withOfficialArt = await prisma.card.count({
      where: { set: { game: { slug: "mitos-y-leyendas" } }, imageUrl: { not: null } },
    });
    if (withOfficialArt === 0) {
      imported = await importMylDemoCards(prisma);
    }
  }
  const sellers = [];
  for (const row of MYL_DEMO_SELLERS) {
    sellers.push(await upsertSeller(prisma, row));
  }

  const variants = await prisma.cardVariant.findMany({
    where: { isDefault: true, card: { set: { game: { slug: "mitos-y-leyendas" } } } },
    include: { card: { include: { set: true } } },
    orderBy: { card: { name: "asc" } },
  });
  const catalog = variants.filter((row) => {
    const attributes = row.card.attributes;
    return !isSyntheticCardAttributes(
      attributes && typeof attributes === "object" && !Array.isArray(attributes)
        ? (attributes as Record<string, unknown>)
        : null,
    );
  });
  const preferred = catalog.filter((row) => DEMO_LISTING_SET_SLUGS.has(row.card.set.slug));
  const rest = catalog.filter((row) => !preferred.some((item) => item.id === row.id));
  const ranked = [...preferred, ...rest];
  const withArt = ranked.filter((row) => row.card.imageUrl);
  const sellable = (withArt.length >= DEMO_LISTING_CAP ? withArt : ranked).slice(0, DEMO_LISTING_CAP);

  const skip = new Set(sellable.map((row) => row.id));
  const leftover = variants.filter((row) => !skip.has(row.id));
  if (leftover.length > 0) {
    await prisma.listing.updateMany({
      where: {
        sellerId: { in: sellers.map((row) => row.id) },
        variantId: { in: leftover.map((row) => row.id) },
        status: { not: "CANCELLED" },
      },
      data: { status: "CANCELLED" },
    });
  }

  let listings = 0;
  for (const [sellerIndex, seller] of sellers.entries()) {
    for (const [cardIndex, variant] of sellable.entries()) {
      if (sellerIndex === 1 && cardIndex % 4 === 0) continue;
      if (sellerIndex === 2 && cardIndex % 3 !== 0) continue;
      if (sellerIndex === 3 && cardIndex % 5 !== 0) continue;
      if (sellerIndex === 4 && cardIndex % 7 !== 0) continue;
      const condition = CONDITIONS[sellerIndex]?.[cardIndex % 3] ?? "NM";
      await upsertListing(prisma, {
        sellerId: seller.id,
        variantId: variant.id,
        title: variant.card.name,
        condition,
        quantity: 1 + (cardIndex % 4),
        priceClp: priceFor(variant.card.rarity, sellerIndex, cardIndex),
      });
      listings += 1;
    }
  }

  const extras = await prisma.listing.findMany({
    where: { sellerId: { in: sellers.map((row) => row.id) }, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, sellerId: true, variantId: true },
  });
  const seen = new Set<string>();
  const cancelIds: string[] = [];
  for (const row of extras) {
    const key = `${row.sellerId}:${row.variantId}`;
    if (seen.has(key)) cancelIds.push(row.id);
    else seen.add(key);
  }
  if (cancelIds.length > 0) {
    await prisma.listing.updateMany({
      where: { id: { in: cancelIds } },
      data: { status: "CANCELLED" },
    });
  }

  return {
    cards: reference.cards + imported.cards,
    sellers: sellers.length,
    listings,
  };
}
