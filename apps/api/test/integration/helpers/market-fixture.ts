import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { reserveStock } from "../../../src/orders/stock";

export type PendingSale = {
  buyerId: string;
  sellerId: string;
  listingId: string;
  checkoutId: string;
  orderId: string;
  variantId: string;
  gameId: string;
  extraUserIds: string[];
};

async function createCatalog(prisma: PrismaClient) {
  const suffix = randomUUID().slice(0, 8);
  const seller = await prisma.user.create({
    data: {
      email: `seller-${suffix}@test.local`,
      displayName: "Seller IT",
      slug: `seller-${suffix}`,
      emailVerifiedAt: new Date(),
      roles: { create: [{ role: "USER" }, { role: "SELLER" }] },
      profile: {
        create: {
          country: "CL",
          comuna: "Santiago",
          region: "Metropolitana de Santiago",
          sellerOnboardedAt: new Date(),
        },
      },
    },
  });
  const game = await prisma.tcgGame.create({
    data: { slug: `it-game-${suffix}`, name: "IT Game", publisher: "IT", sortOrder: 99 },
  });
  const set = await prisma.tcgSet.create({
    data: { gameId: game.id, code: `IT${suffix.slice(0, 4)}`, slug: `it-set-${suffix}`, name: "IT Set" },
  });
  const card = await prisma.card.create({
    data: {
      setId: set.id,
      number: "001",
      slug: `it-card-${suffix}`,
      name: "IT Card",
      rarity: "Rare",
      supertype: "Creature",
    },
  });
  const variant = await prisma.cardVariant.create({
    data: { cardId: card.id, language: "EN", finish: "NORMAL", isDefault: true },
  });
  const listing = await prisma.listing.create({
    data: {
      sellerId: seller.id,
      variantId: variant.id,
      productType: "SINGLE",
      title: "IT Card",
      condition: "NM",
      quantity: 1,
      priceClp: 80000,
      status: "ACTIVE",
      allowsMeetup: true,
      allowsShipping: true,
      publishedAt: new Date(),
    },
  });
  return { suffix, seller, game, listing, variant };
}

export async function createBuyer(prisma: PrismaClient, listingId?: string, quantity = 1) {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `buyer-${suffix}@test.local`,
      displayName: "Buyer IT",
      slug: `buyer-${suffix}`,
      emailVerifiedAt: new Date(),
      roles: { create: [{ role: "USER" }] },
      profile: { create: { country: "CL" } },
      ...(listingId
        ? { cart: { create: { items: { create: { listingId, quantity } } } } }
        : {}),
    },
  });
}

export async function createPendingSale(
  prisma: PrismaClient,
  opts?: { expiresAt?: Date; quantity?: number },
): Promise<PendingSale> {
  const quantity = opts?.quantity ?? 1;
  const expiresAt = opts?.expiresAt ?? new Date(Date.now() + 30 * 60_000);
  const { seller, game, listing, variant, suffix } = await createCatalog(prisma);
  if (quantity !== 1) {
    await prisma.listing.update({ where: { id: listing.id }, data: { quantity } });
  }
  const buyer = await createBuyer(prisma);

  const created = await prisma.$transaction(async (tx) => {
    await reserveStock(tx, listing.id, quantity);
    return tx.checkout.create({
      data: {
        buyerId: buyer.id,
        status: "PENDING_PAYMENT",
        totalClp: 80000 * quantity,
        expiresAt,
        orders: {
          create: {
            orderNumber: `TCG-IT-${suffix}`,
            buyerId: buyer.id,
            sellerId: seller.id,
            status: "PENDING_PAYMENT",
            subtotalClp: 80000 * quantity,
            shippingClp: 0,
            commissionClp: Math.floor(80000 * quantity * 0.08),
            totalClp: 80000 * quantity,
            shippingMethod: "MEETUP",
            items: {
              create: {
                listingId: listing.id,
                variantId: variant.id,
                titleSnapshot: "IT Card",
                condition: "NM",
                quantity,
                unitPriceClp: 80000,
              },
            },
            shipment: { create: { method: "MEETUP", status: "PENDING" } },
          },
        },
      },
      include: { orders: true },
    });
  });

  const order = created.orders[0];
  if (!order) {
    throw new Error("expected order");
  }

  return {
    buyerId: buyer.id,
    sellerId: seller.id,
    listingId: listing.id,
    checkoutId: created.id,
    orderId: order.id,
    variantId: variant.id,
    gameId: game.id,
    extraUserIds: [],
  };
}

export async function createOpenListing(prisma: PrismaClient) {
  const { seller, game, listing, variant } = await createCatalog(prisma);
  return { sellerId: seller.id, listingId: listing.id, variantId: variant.id, gameId: game.id };
}

export async function cleanupUsersAndCatalog(
  prisma: PrismaClient,
  input: { userIds: string[]; listingId: string; variantId: string; gameId: string; checkoutIds?: string[] },
): Promise<void> {
  const checkouts = await prisma.checkout.findMany({
    where: {
      OR: [{ id: { in: input.checkoutIds ?? [] } }, { buyerId: { in: input.userIds } }],
    },
    select: { id: true },
  });
  const checkoutIds = checkouts.map((row) => row.id);
  const orderIds = (
    await prisma.order.findMany({ where: { checkoutId: { in: checkoutIds } }, select: { id: true } })
  ).map((row) => row.id);
  const paymentIds = (
    await prisma.payment.findMany({ where: { orderId: { in: orderIds } }, select: { id: true } })
  ).map((row) => row.id);

  const refundIds = (
    await prisma.refund.findMany({ where: { paymentId: { in: paymentIds } }, select: { id: true } })
  ).map((row) => row.id);

  await prisma.webhookEvent.deleteMany({ where: { providerEventId: { startsWith: "it-" } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: refundIds } } });
  await prisma.refund.deleteMany({ where: { paymentId: { in: paymentIds } } });
  await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
  await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.checkout.deleteMany({ where: { id: { in: checkoutIds } } });
  await prisma.cartItem.deleteMany({ where: { listingId: input.listingId } });
  await prisma.cart.deleteMany({ where: { userId: { in: input.userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: input.userIds } } });
  await prisma.auditLog.deleteMany({
    where: { entityId: { in: [...checkoutIds, ...orderIds, input.listingId] } },
  });
  await prisma.listing.deleteMany({ where: { id: input.listingId } });
  await prisma.cardVariant.deleteMany({ where: { id: input.variantId } });
  const card = await prisma.card.findFirst({ where: { set: { gameId: input.gameId } } });
  if (card) {
    await prisma.card.delete({ where: { id: card.id } });
  }
  await prisma.tcgSet.deleteMany({ where: { gameId: input.gameId } });
  await prisma.tcgGame.deleteMany({ where: { id: input.gameId } });
  await prisma.address.deleteMany({ where: { userId: { in: input.userIds } } });
  await prisma.profile.deleteMany({ where: { userId: { in: input.userIds } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: input.userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: input.userIds } } });
}

export async function cleanupSale(prisma: PrismaClient, sale: PendingSale): Promise<void> {
  await cleanupUsersAndCatalog(prisma, {
    userIds: [sale.buyerId, sale.sellerId, ...sale.extraUserIds],
    listingId: sale.listingId,
    variantId: sale.variantId,
    gameId: sale.gameId,
    checkoutIds: [sale.checkoutId],
  });
}

export async function listingStock(prisma: PrismaClient, listingId: string) {
  const row = await prisma.listing.findUniqueOrThrow({
    where: { id: listingId },
    select: { quantity: true, quantityReserved: true, status: true },
  });
  if (row.quantity < 0) {
    throw new Error("quantity went negative");
  }
  if (row.quantityReserved < 0 || row.quantityReserved > row.quantity) {
    throw new Error(`quantityReserved invariant failed: reserved=${row.quantityReserved} qty=${row.quantity}`);
  }
  return row;
}
