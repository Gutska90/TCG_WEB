import { LEGAL } from "@tcg/config";
import type { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { slugifyStable } from "./slug";

/** Same password as BETA_TEST_USERS. Synthetic sellers, not real people. */
export const SHOWCASE_PASSWORD = "BetaPassw0rd!";

export const SHOWCASE_SELLERS = [
  {
    email: "cartas.santiago.beta@example.test",
    password: SHOWCASE_PASSWORD,
    displayName: "Cartas Santiago",
    slug: "cartas-santiago",
    comuna: "Ñuñoa",
    region: "Metropolitana de Santiago",
  },
  {
    email: "mazo.valparaiso.beta@example.test",
    password: SHOWCASE_PASSWORD,
    displayName: "Mazo Valparaíso",
    slug: "mazo-valparaiso",
    comuna: "Valparaíso",
    region: "Valparaíso",
  },
  {
    email: "foil.concepcion.beta@example.test",
    password: SHOWCASE_PASSWORD,
    displayName: "Foil Concepción",
    slug: "foil-concepcion",
    comuna: "Concepción",
    region: "Biobío",
  },
] as const;

type ShowcaseCard = {
  number: string;
  name: string;
  rarity: string;
  supertype: string;
  priceClp: number;
};

type ShowcaseGame = {
  slug: string;
  name: string;
  publisher: string;
  sortOrder: number;
  set: { code: string; slug: string; name: string };
  cards: ShowcaseCard[];
};

/**
 * Staging vitrina. Original names only — not publisher characters and not TCGMatch copy.
 * Yu-Gi-Oh is demo catalog, not a Fase 1 product expansion.
 */
export const SHOWCASE_GAMES: ShowcaseGame[] = [
  {
    slug: "pokemon",
    name: "Pokémon",
    publisher: "The Pokémon Company",
    sortOrder: 1,
    set: { code: "VTK", slug: "vitrina-kanto", name: "Vitrina Kanto" },
    cards: [
      { number: "001", name: "Ember Pup", rarity: "Common", supertype: "Creature", priceClp: 2500 },
      { number: "002", name: "Tide Sprite", rarity: "Common", supertype: "Creature", priceClp: 2800 },
      { number: "003", name: "Stoneback Cub", rarity: "Uncommon", supertype: "Creature", priceClp: 4200 },
      { number: "004", name: "Gale Finch", rarity: "Uncommon", supertype: "Creature", priceClp: 3900 },
      { number: "005", name: "Moss Cap", rarity: "Rare", supertype: "Creature", priceClp: 8900 },
      { number: "006", name: "Nightveil Lynx", rarity: "Rare", supertype: "Creature", priceClp: 12500 },
    ],
  },
  {
    slug: "magic",
    name: "Magic: The Gathering",
    publisher: "Wizards of the Coast",
    sortOrder: 2,
    set: { code: "AOS", slug: "archive-of-sparks", name: "Archive of Sparks" },
    cards: [
      { number: "001", name: "Amberbolt Adept", rarity: "Common", supertype: "Creature", priceClp: 1500 },
      { number: "002", name: "Glimmerfen Warden", rarity: "Uncommon", supertype: "Creature", priceClp: 4500 },
      { number: "003", name: "Sundial Archivist", rarity: "Uncommon", supertype: "Creature", priceClp: 5200 },
      { number: "004", name: "Ironroot Channeler", rarity: "Rare", supertype: "Creature", priceClp: 9800 },
      { number: "005", name: "Whispering Relic", rarity: "Rare", supertype: "Artifact", priceClp: 11200 },
      { number: "006", name: "Cinder Pact", rarity: "Mythic", supertype: "Enchantment", priceClp: 18500 },
    ],
  },
  {
    slug: "one-piece",
    name: "One Piece",
    publisher: "Bandai",
    sortOrder: 3,
    set: { code: "GLD", slug: "grand-line-demo", name: "Grand Line Demo" },
    cards: [
      { number: "001", name: "Dockside Lookout", rarity: "Common", supertype: "Character", priceClp: 2200 },
      { number: "002", name: "Tidechart Navigator", rarity: "Uncommon", supertype: "Character", priceClp: 4100 },
      { number: "003", name: "Barrelhold Cook", rarity: "Uncommon", supertype: "Character", priceClp: 3600 },
      { number: "004", name: "Skyline Spotter", rarity: "Rare", supertype: "Character", priceClp: 7600 },
      { number: "005", name: "Harbor Quartermaster", rarity: "Rare", supertype: "Character", priceClp: 9400 },
      { number: "006", name: "Coral Line Cadet", rarity: "Super Rare", supertype: "Character", priceClp: 15800 },
    ],
  },
  {
    slug: "yugioh",
    name: "Yu-Gi-Oh!",
    publisher: "Konami",
    sortOrder: 4,
    set: { code: "SDD", slug: "shadow-duel-demo", name: "Shadow Duel Demo" },
    cards: [
      { number: "001", name: "Glyphbound Sentinel", rarity: "Common", supertype: "Monster", priceClp: 1800 },
      { number: "002", name: "Mirrorchain Mage", rarity: "Rare", supertype: "Monster", priceClp: 6400 },
      { number: "003", name: "Trapweave Oracle", rarity: "Rare", supertype: "Trap", priceClp: 7100 },
      { number: "004", name: "Scalebound Duelist", rarity: "Super Rare", supertype: "Monster", priceClp: 10200 },
      { number: "005", name: "Vault Key Spirit", rarity: "Super Rare", supertype: "Spell", priceClp: 8800 },
      { number: "006", name: "Dualstar Tactician", rarity: "Ultra Rare", supertype: "Monster", priceClp: 16400 },
    ],
  },
];

function utcDay(daysAgo: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}

async function upsertSeller(
  prisma: PrismaClient,
  input: (typeof SHOWCASE_SELLERS)[number],
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
    },
    create: {
      userId: user.id,
      country: "CL",
      comuna: input.comuna,
      region: input.region,
      sellerOnboardedAt: now,
    },
  });
  const existingAddress = await prisma.address.findFirst({ where: { userId: user.id } });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: user.id,
        label: "Principal",
        recipientName: input.displayName,
        phone: "+56911111111",
        line1: "Pasaje Vitrina 100",
        comuna: input.comuna,
        region: input.region,
        postalCode: "8320000",
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
    });
  }
  return user;
}

async function upsertShowcaseCard(
  prisma: PrismaClient,
  setId: string,
  cardInput: ShowcaseCard,
): Promise<{ variantId: string }> {
  const slug = slugifyStable(cardInput.name, "card");
  const card = await prisma.card.upsert({
    where: { setId_slug: { setId, slug } },
    update: {
      name: cardInput.name,
      number: cardInput.number,
      rarity: cardInput.rarity,
      supertype: cardInput.supertype,
    },
    create: {
      setId,
      slug,
      number: cardInput.number,
      name: cardInput.name,
      rarity: cardInput.rarity,
      supertype: cardInput.supertype,
      attributes: { source: "showcase-seed" },
    },
  });
  const variant = await prisma.cardVariant.upsert({
    where: {
      cardId_language_finish_finishDetail: {
        cardId: card.id,
        language: "EN",
        finish: "NORMAL",
        finishDetail: "",
      },
    },
    update: { isDefault: true },
    create: {
      cardId: card.id,
      language: "EN",
      finish: "NORMAL",
      isDefault: true,
      externalIds: { showcase: true },
    },
  });
  return { variantId: variant.id };
}

async function ensureListing(
  prisma: PrismaClient,
  input: { sellerId: string; variantId: string; title: string; priceClp: number; quantity: number },
): Promise<void> {
  const existing = await prisma.listing.findFirst({
    where: { sellerId: input.sellerId, variantId: input.variantId, title: input.title },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    const available = existing.quantity - existing.quantityReserved;
    if (existing.status !== "ACTIVE" || available < 1) {
      await prisma.listing.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          quantity: Math.max(existing.quantity, input.quantity),
          priceClp: input.priceClp,
        },
      });
    }
    return;
  }
  await prisma.listing.create({
    data: {
      sellerId: input.sellerId,
      variantId: input.variantId,
      productType: "SINGLE",
      title: input.title,
      condition: "NM",
      quantity: input.quantity,
      priceClp: input.priceClp,
      status: "ACTIVE",
      description: "Publicación de vitrina beta. No es un artículo real.",
      allowsMeetup: true,
      allowsShipping: true,
      publishedAt: new Date(),
    },
  });
}

async function seedPriceHistory(prisma: PrismaClient, variantId: string, basePrice: number): Promise<void> {
  for (let daysAgo = 13; daysAgo >= 0; daysAgo -= 1) {
    const capturedOn = utcDay(daysAgo);
    const drift = Math.round(basePrice * (0.92 + ((13 - daysAgo) % 5) * 0.02));
    await prisma.cardPrice.upsert({
      where: {
        variantId_source_capturedOn: { variantId, source: "LISTING_MIN", capturedOn },
      },
      update: { priceClp: drift },
      create: { variantId, source: "LISTING_MIN", priceClp: drift, capturedOn },
    });
  }
}

async function seedBuyerCollection(
  prisma: PrismaClient,
  buyerId: string,
  variantIds: string[],
): Promise<void> {
  const collection = await prisma.collection.upsert({
    where: { userId: buyerId },
    update: {},
    create: { userId: buyerId, name: "Default", isDefault: true },
  });
  for (const [index, variantId] of variantIds.slice(0, 12).entries()) {
    const existing = await prisma.collectionItem.findFirst({
      where: { collectionId: collection.id, variantId, condition: "NM" },
    });
    if (existing) continue;
    await prisma.collectionItem.create({
      data: {
        collectionId: collection.id,
        variantId,
        condition: "NM",
        quantity: index % 4 === 0 ? 2 : 1,
        purchasePriceClp: 3000 + index * 400,
        purchasedAt: utcDay(20 - index),
        notes: "Lote de vitrina beta",
      },
    });
  }

  const extra = Number(process.env.SHOWCASE_COLLECTION_SIZE ?? "0");
  if (!Number.isFinite(extra) || extra <= 0) return;
  const pokemon = SHOWCASE_GAMES.find((game) => game.slug === "pokemon");
  if (!pokemon) return;
  const game = await prisma.tcgGame.findUnique({ where: { slug: "pokemon" } });
  if (!game) return;
  const set = await prisma.tcgSet.findUnique({
    where: { gameId_slug: { gameId: game.id, slug: pokemon.set.slug } },
  });
  if (!set) return;
  const start = 100;
  for (let i = 0; i < extra; i += 1) {
    const { variantId } = await upsertShowcaseCard(prisma, set.id, {
      number: String(start + i).padStart(3, "0"),
      name: `Bulk Pup ${start + i}`,
      rarity: "Common",
      supertype: "Creature",
      priceClp: 1000,
    });
    const existing = await prisma.collectionItem.findFirst({
      where: { collectionId: collection.id, variantId, condition: "NM" },
    });
    if (existing) continue;
    await prisma.collectionItem.create({
      data: {
        collectionId: collection.id,
        variantId,
        condition: "NM",
        quantity: 1,
        purchasePriceClp: 1000,
        notes: "Lote masivo para prueba de rendimiento",
      },
    });
  }
}

async function seedBuyerWishlist(prisma: PrismaClient, buyerId: string, variantIds: string[]): Promise<void> {
  for (const [index, variantId] of variantIds.slice(0, 6).entries()) {
    await prisma.wishlistItem.upsert({
      where: { userId_variantId: { userId: buyerId, variantId } },
      update: { targetPriceClp: 4000 + index * 500, notifyBelow: true },
      create: {
        userId: buyerId,
        variantId,
        targetPriceClp: 4000 + index * 500,
        notifyBelow: true,
      },
    });
  }
}

export async function seedShowcase(
  prisma: PrismaClient,
  input: { buyerId: string; defaultSellerId: string },
): Promise<{ games: number; cards: number; listings: number }> {
  const extraSellers = [];
  for (const sellerInput of SHOWCASE_SELLERS) {
    extraSellers.push(await upsertSeller(prisma, sellerInput));
  }
  const sellerIds = [input.defaultSellerId, ...extraSellers.map((row) => row.id)];

  const variantIds: string[] = [];
  let listings = 0;
  for (const gameInput of SHOWCASE_GAMES) {
    const game = await prisma.tcgGame.upsert({
      where: { slug: gameInput.slug },
      update: {
        name: gameInput.name,
        publisher: gameInput.publisher,
        isActive: true,
        sortOrder: gameInput.sortOrder,
      },
      create: {
        slug: gameInput.slug,
        name: gameInput.name,
        publisher: gameInput.publisher,
        isActive: true,
        sortOrder: gameInput.sortOrder,
      },
    });
    const set = await prisma.tcgSet.upsert({
      where: { gameId_slug: { gameId: game.id, slug: gameInput.set.slug } },
      update: { name: gameInput.set.name, code: gameInput.set.code },
      create: {
        gameId: game.id,
        code: gameInput.set.code,
        slug: gameInput.set.slug,
        name: gameInput.set.name,
        releasedAt: new Date("2026-03-01"),
        printedTotal: gameInput.cards.length,
        total: gameInput.cards.length,
      },
    });
    for (const [cardIndex, cardInput] of gameInput.cards.entries()) {
      const { variantId } = await upsertShowcaseCard(prisma, set.id, cardInput);
      variantIds.push(variantId);
      await seedPriceHistory(prisma, variantId, cardInput.priceClp);
      const sellerId = sellerIds[cardIndex % sellerIds.length] ?? input.defaultSellerId;
      await ensureListing(prisma, {
        sellerId,
        variantId,
        title: cardInput.name,
        priceClp: cardInput.priceClp,
        quantity: 3 + (cardIndex % 4),
      });
      listings += 1;
    }
  }

  await seedBuyerCollection(prisma, input.buyerId, variantIds);
  await seedBuyerWishlist(prisma, input.buyerId, [...variantIds].reverse());

  return { games: SHOWCASE_GAMES.length, cards: variantIds.length, listings };
}
