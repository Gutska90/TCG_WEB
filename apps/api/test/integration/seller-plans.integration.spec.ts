import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";
import type { RequestUser } from "../../src/auth/request-user";
import {
  cleanupUsersAndCatalog,
  createBuyer,
  createOpenListing,
} from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function user(id: string, roles: RequestUser["roles"] = ["USER"]): RequestUser {
  return {
    id,
    email: "it-plan@test.local",
    roles,
    sessionId: "it-plan",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("M1 seller plans (postgres)", () => {
  const prisma = new PrismaService();
  const provider = new FakePaymentProvider();
  const { orders, sellerPlans, marketplaceFees } = createMoneyServices(prisma, provider);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for integration tests");
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("defaults to FREE, assigns PLUS/PRO/STORE, expired and future fall back to FREE", async () => {
    const listing = await createOpenListing(prisma);
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-plan-${listing.sellerId.slice(0, 8)}@test.local`,
        displayName: "Admin plan",
        slug: `admin-plan-${listing.sellerId.slice(0, 8)}`,
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "ADMIN" }] },
      },
    });
    try {
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, new Date())).toBe("FREE");
      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listing.sellerId, {
        plan: "SELLER_PLUS",
        reason: "beta invite plus",
      });
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, new Date())).toBe("SELLER_PLUS");
      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listing.sellerId, {
        plan: "SELLER_PRO",
        reason: "beta invite pro",
      });
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, new Date())).toBe("SELLER_PRO");
      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listing.sellerId, {
        plan: "STORE",
        reason: "beta invite store",
      });
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, new Date())).toBe("STORE");
      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listing.sellerId, {
        plan: "FREE",
        reason: "back to free",
      });
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, new Date())).toBe("FREE");

      const now = new Date();
      const future = new Date(now.getTime() + 86_400_000);
      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listing.sellerId, {
        plan: "SELLER_PLUS",
        reason: "starts later",
        startsAt: future,
      });
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, now)).toBe("FREE");
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, future)).toBe("SELLER_PLUS");

      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listing.sellerId, {
        plan: "SELLER_PRO",
        reason: "already ended",
        startsAt: new Date(now.getTime() - 86_400_000),
        endsAt: new Date(now.getTime() - 3_600_000),
      });
      expect(await sellerPlans.getEffectivePlan(listing.sellerId, now)).toBe("FREE");

      const audit = await prisma.auditLog.findFirst({
        where: { entityId: listing.sellerId, action: "seller.plan.assigned" },
        orderBy: { createdAt: "desc" },
      });
      expect(audit).toBeTruthy();
    } finally {
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listing.sellerId, adminUser.id],
        listingId: listing.listingId,
        variantId: listing.variantId,
        gameId: listing.gameId,
      });
    }
  });

  it("snapshots per-seller fees on multi-seller checkout and keeps them on later plan change", async () => {
    const listingA = await createOpenListing(prisma);
    const listingB = await createOpenListing(prisma);
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-ms-${listingA.sellerId.slice(0, 8)}@test.local`,
        displayName: "Admin ms",
        slug: `admin-ms-${listingA.sellerId.slice(0, 8)}`,
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "ADMIN" }] },
      },
    });
    const buyer = await createBuyer(prisma);
    try {
      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listingA.sellerId, {
        plan: "FREE",
        reason: "seller a free",
      });
      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listingB.sellerId, {
        plan: "STORE",
        reason: "seller b store",
      });
      await prisma.cart.create({
        data: {
          userId: buyer.id,
          items: {
            create: [
              { listingId: listingA.listingId, quantity: 1 },
              { listingId: listingB.listingId, quantity: 1 },
            ],
          },
        },
      });
      const checkout = await orders.createCheckout(
        user(buyer.id),
        {
          shippingSelections: [
            { sellerId: listingA.sellerId, method: "MEETUP" },
            { sellerId: listingB.sellerId, method: "MEETUP" },
          ],
        },
        undefined,
        { initPoint: null, sandboxInitPoint: null, mock: true },
      );
      const orderA = checkout.orders.find((row) => row.seller.id === listingA.sellerId);
      const orderB = checkout.orders.find((row) => row.seller.id === listingB.sellerId);
      expect(orderA?.commissionClp).toBe(4_800);
      expect(orderB?.commissionClp).toBe(2_400);
      expect(orderA?.marketplaceFee?.planCode).toBe("FREE");
      expect(orderB?.marketplaceFee?.planCode).toBe("STORE");

      await sellerPlans.assignPlan(user(adminUser.id, ["ADMIN"]), listingA.sellerId, {
        plan: "STORE",
        reason: "after checkout",
      });
      const stillA = await prisma.order.findUniqueOrThrow({ where: { id: orderA!.id } });
      expect(stillA.commissionClp).toBe(4_800);
      expect(stillA.sellerPlanCode).toBe("FREE");

      const quoteNow = await marketplaceFees.calculate({
        sellerId: listingA.sellerId,
        orderSubtotalClp: 80_000,
        at: new Date(),
      });
      expect(quoteNow.platformFeeClp).toBe(2_400);
    } finally {
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listingB.sellerId],
        listingId: listingB.listingId,
        variantId: listingB.variantId,
        gameId: listingB.gameId,
      });
      await cleanupUsersAndCatalog(prisma, {
        userIds: [listingA.sellerId, buyer.id, adminUser.id],
        listingId: listingA.listingId,
        variantId: listingA.variantId,
        gameId: listingA.gameId,
      });
    }
  });
});
