import { LEGAL, LAUNCH_PROMO_INACTIVE, orderFeeSnapshotFromQuote, quoteMarketplaceFee } from "@tcg/config";
import type { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { ledgerIdempotencyKey, sellerNetClp } from "../ledger/ledger.money";
import { consumeReservedStock, releaseStock, reserveStock } from "../orders/stock";
import { seedCatalog, seedShippingRates } from "./seed";
import { seedShowcase } from "./showcase-seed";

/** Keep in sync with e2e/fixtures.ts — Playwright filters admin refunds by this reason. */
export const QA_REFUND_REASON = "QA_B4_REFUND_RETRY";
export const QA_REFUND_ORDER_PREFIX = "TCG-QA-B4";
export const QA_REFUND_LISTING_TITLE = "QA B4 refund fixture";

const E2E_AVAILABLE_FLOOR = 8;
const E2E_RESTOCK_QTY = 8;

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

async function expireStaleCheckouts(prisma: PrismaClient): Promise<number> {
  const stale = await prisma.checkout.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lte: new Date() } },
    select: { id: true },
    take: 200,
  });
  let expired = 0;
  for (const row of stale) {
    try {
      const ok = await prisma.$transaction(async (tx) => {
        const checkout = await tx.checkout.findUnique({
          where: { id: row.id },
          include: { orders: { include: { items: true } } },
        });
        if (!checkout || checkout.status !== "PENDING_PAYMENT") return false;
        if (checkout.expiresAt > new Date()) return false;
        for (const order of checkout.orders) {
          if (order.status !== "PENDING_PAYMENT") continue;
          for (const item of order.items) {
            await releaseStock(tx, item.listingId, item.quantity);
          }
          await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
          await tx.shipment.updateMany({ where: { orderId: order.id }, data: { status: "CANCELLED" } });
        }
        await tx.checkout.update({ where: { id: checkout.id }, data: { status: "EXPIRED" } });
        return true;
      });
      if (ok) expired += 1;
    } catch {
      // Seed is best-effort housekeeping; a dirty row must not abort beta:seed.
    }
  }
  return expired;
}

async function ensureSellableListing(
  prisma: PrismaClient,
  input: {
    sellerId: string;
    variantId: string;
    title: string;
    description: string;
    quantity: number;
    availableFloor: number;
  },
) {
  let listing = await prisma.listing.findFirst({
    where: { sellerId: input.sellerId, variantId: input.variantId, title: input.title },
    orderBy: { createdAt: "asc" },
  });
  if (!listing) {
    return prisma.listing.create({
      data: {
        sellerId: input.sellerId,
        variantId: input.variantId,
        productType: "SINGLE",
        title: input.title,
        condition: "NM",
        quantity: input.quantity,
        priceClp: 5000,
        status: "ACTIVE",
        description: input.description,
        allowsMeetup: true,
        allowsShipping: true,
        publishedAt: new Date(),
      },
    });
  }
  const available = listing.quantity - listing.quantityReserved;
  if (available < input.availableFloor) {
    listing = await prisma.listing.update({
      where: { id: listing.id },
      data: { quantity: listing.quantity + input.quantity, status: "ACTIVE" },
    });
  }
  return listing;
}

async function ensureFailedRefundFixture(
  prisma: PrismaClient,
  input: { buyerId: string; sellerId: string; listingId: string; variantId: string },
): Promise<string> {
  const open = await prisma.refund.findFirst({
    where: { reason: QA_REFUND_REASON, status: { in: ["FAILED", "PENDING"] } },
    select: { id: true },
  });
  if (open) return open.id;

  const listing = await prisma.listing.findUniqueOrThrow({ where: { id: input.listingId } });
  if (listing.quantity - listing.quantityReserved < 1) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: { quantity: listing.quantity + 1, status: "ACTIVE" },
    });
  }

  const priceClp = 5000;
  const quote = quoteMarketplaceFee({
    plan: "FREE",
    orderSubtotalClp: priceClp,
    promoWindow: LAUNCH_PROMO_INACTIVE,
  });
  const fee = quote.platformFeeClp;
  const net = sellerNetClp(priceClp, fee);
  const orderNumber = `${QA_REFUND_ORDER_PREFIX}-${Date.now().toString(36).toUpperCase()}`;

  return prisma.$transaction(async (tx) => {
    await reserveStock(tx, input.listingId, 1);
    const checkout = await tx.checkout.create({
      data: {
        buyerId: input.buyerId,
        status: "PAID",
        totalClp: priceClp,
        expiresAt: new Date(Date.now() + 30 * 60_000),
        orders: {
          create: {
            orderNumber,
            buyerId: input.buyerId,
            sellerId: input.sellerId,
            status: "PAID",
            subtotalClp: priceClp,
            shippingClp: 0,
            ...orderFeeSnapshotFromQuote(quote),
            totalClp: priceClp,
            shippingMethod: "MEETUP",
            paidAt: new Date(),
            items: {
              create: {
                listingId: input.listingId,
                variantId: input.variantId,
                titleSnapshot: QA_REFUND_LISTING_TITLE,
                condition: "NM",
                quantity: 1,
                unitPriceClp: priceClp,
              },
            },
            shipment: { create: { method: "MEETUP", status: "PENDING" } },
            payment: {
              create: {
                provider: "MERCADOPAGO",
                providerPaymentId: `local_qa_${orderNumber}`,
                status: "HELD",
                amountClp: priceClp,
                heldAt: new Date(),
              },
            },
          },
        },
      },
      include: { orders: { include: { payment: true } } },
    });
    const order = checkout.orders[0];
    const payment = order?.payment;
    if (!order || !payment) {
      throw new Error("QA refund fixture: checkout sin orden o pago");
    }
    await consumeReservedStock(tx, input.listingId, 1);
    await tx.ledgerEntry.create({
      data: {
        sellerId: input.sellerId,
        entryType: "PAYMENT_CAPTURED",
        amountClp: net,
        orderId: order.id,
        paymentId: payment.id,
        idempotencyKey: ledgerIdempotencyKey("PAYMENT_CAPTURED", { orderId: order.id }),
        metadata: { totalClp: priceClp, commissionClp: fee, qa: true },
      },
    });
    const refund = await tx.refund.create({
      data: {
        paymentId: payment.id,
        amountClp: priceClp,
        reason: QA_REFUND_REASON,
        status: "FAILED",
      },
    });
    await tx.auditLog.create({
      data: {
        action: "refund.failed",
        entityType: "Refund",
        entityId: refund.id,
        metadata: { event: "REFUND_FAILED", code: "qa_seed", qa: true },
      },
    });
    return refund.id;
  });
}

export async function seedBeta(prisma: PrismaClient): Promise<{ listingId: string; cardName: string }> {
  await seedCatalog(prisma);
  await seedShippingRates(prisma);
  const expired = await expireStaleCheckouts(prisma);
  const buyer = await upsertUser(prisma, BETA_TEST_USERS.buyer, ["USER"]);
  const seller = await upsertUser(prisma, BETA_TEST_USERS.seller, ["USER", "SELLER"], { sellerOnboarded: true });
  await upsertUser(prisma, BETA_TEST_USERS.admin, ["USER", "ADMIN", "SUPER_ADMIN"]);

  const card = await prisma.card.findFirst({
    where: { name: "Test Mon #1", set: { slug: "test-set", game: { slug: "pokemon" } } },
    include: { variants: true },
  });
  if (!card?.variants[0]) {
    throw new Error("Seed de catálogo incompleto: falta Test Mon #1");
  }
  const listing = await ensureSellableListing(prisma, {
    sellerId: seller.id,
    variantId: card.variants[0].id,
    title: card.name,
    description: "Publicación de prueba beta. No es un artículo real.",
    quantity: E2E_RESTOCK_QTY,
    availableFloor: E2E_AVAILABLE_FLOOR,
  });

  const qaCard = await prisma.card.findFirst({
    where: { name: "Test Mon #2", set: { slug: "test-set", game: { slug: "pokemon" } } },
    include: { variants: true },
  });
  if (!qaCard?.variants[0]) {
    throw new Error("Seed de catálogo incompleto: falta Test Mon #2");
  }
  const qaListing = await ensureSellableListing(prisma, {
    sellerId: seller.id,
    variantId: qaCard.variants[0].id,
    title: QA_REFUND_LISTING_TITLE,
    description: "Listing sintético para E2E de retry de refund. No es un artículo real.",
    quantity: 1,
    availableFloor: 1,
  });
  await ensureFailedRefundFixture(prisma, {
    buyerId: buyer.id,
    sellerId: seller.id,
    listingId: qaListing.id,
    variantId: qaCard.variants[0].id,
  });

  const showcase = await seedShowcase(prisma, { buyerId: buyer.id, defaultSellerId: seller.id });
  if (expired > 0) {
    console.log(`Beta seed: ${expired} checkout(s) expirados (reservas liberadas).`);
  }
  console.log(
    `Beta seed: vitrina ${showcase.games} juegos, ${showcase.cards} cartas, ${showcase.listings} publicaciones.`,
  );
  return { listingId: listing.id, cardName: card.name };
}
