import { LEGAL } from "@tcg/config";
import type { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { seedCatalog, seedShippingRates } from "./seed";

/** Synthetic beta testers. Not real people. Keep in sync with e2e/fixtures.ts */
export const BETA_TEST_USERS = {
  buyer: {
    email: "buyer.beta@example.test",
    password: "BetaPassw0rd!",
    displayName: "Comprador Beta",
    slug: "comprador-beta",
  },
  seller: {
    email: "seller.beta@example.test",
    password: "BetaPassw0rd!",
    displayName: "Vendedor Beta",
    slug: "vendedor-beta",
  },
  admin: {
    email: "admin.beta@example.test",
    password: "BetaPassw0rd!",
    displayName: "Admin Beta",
    slug: "admin-beta",
  },
} as const;

const ADDRESS = {
  label: "Principal",
  recipientName: "Tester Beta",
  phone: "+56911111111",
  line1: "Calle Falsa 123",
  comuna: "Santiago",
  region: "Metropolitana de Santiago",
  postalCode: "8320000",
  isDefaultShipping: true,
  isDefaultBilling: true,
};

async function upsertUser(
  prisma: PrismaClient,
  input: (typeof BETA_TEST_USERS)[keyof typeof BETA_TEST_USERS],
  roles: Array<"USER" | "SELLER" | "ADMIN" | "SUPER_ADMIN">,
  extra?: { sellerOnboarded?: boolean },
) {
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
  for (const role of roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: extra?.sellerOnboarded
      ? { sellerOnboardedAt: now, comuna: ADDRESS.comuna, region: ADDRESS.region, country: "CL" }
      : { country: "CL" },
    create: {
      userId: user.id,
      country: "CL",
      comuna: extra?.sellerOnboarded ? ADDRESS.comuna : undefined,
      region: extra?.sellerOnboarded ? ADDRESS.region : undefined,
      sellerOnboardedAt: extra?.sellerOnboarded ? now : undefined,
    },
  });
  const existingAddress = await prisma.address.findFirst({ where: { userId: user.id } });
  if (!existingAddress) {
    await prisma.address.create({ data: { userId: user.id, ...ADDRESS } });
  }
  return user;
}

export async function seedBeta(prisma: PrismaClient): Promise<{ listingId: string; cardName: string }> {
  await seedCatalog(prisma);
  await seedShippingRates(prisma);
  await upsertUser(prisma, BETA_TEST_USERS.buyer, ["USER"]);
  const seller = await upsertUser(prisma, BETA_TEST_USERS.seller, ["USER", "SELLER"], { sellerOnboarded: true });
  await upsertUser(prisma, BETA_TEST_USERS.admin, ["USER", "ADMIN", "SUPER_ADMIN"]);

  const card = await prisma.card.findFirst({
    where: { name: "Test Mon #1", set: { slug: "test-set", game: { slug: "pokemon" } } },
    include: { variants: true },
  });
  if (!card?.variants[0]) {
    throw new Error("Seed de catálogo incompleto: falta Test Mon #1");
  }
  const variantId = card.variants[0].id;
  let listing = await prisma.listing.findFirst({
    where: { sellerId: seller.id, variantId, status: "ACTIVE" },
  });
  if (!listing) {
    listing = await prisma.listing.create({
      data: {
        sellerId: seller.id,
        variantId,
        productType: "SINGLE",
        title: card.name,
        condition: "NM",
        quantity: 8,
        priceClp: 5000,
        status: "ACTIVE",
        description: "Publicación de prueba beta. No es un artículo real.",
        allowsMeetup: true,
        allowsShipping: true,
        publishedAt: new Date(),
      },
    });
  } else if (listing.quantity - listing.quantityReserved < 2) {
    listing = await prisma.listing.update({
      where: { id: listing.id },
      data: { quantity: listing.quantity + 8, status: "ACTIVE" },
    });
  }
  return { listingId: listing.id, cardName: card.name };
}
