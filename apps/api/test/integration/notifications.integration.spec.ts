import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaService } from "../../src/prisma/prisma.service";
import { cleanupSale, createPendingSale } from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("B8 order notifications (postgres)", () => {
  const prisma = new PrismaService();
  const { orders, notifications } = createMoneyServices(prisma, new FakePaymentProvider());

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("emits SALE_MADE and PURCHASE_MADE once when checkout is paid", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });
      await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });

      const buyerInbox = await notifications.list(sale.buyerId, 1, 20);
      const sellerInbox = await notifications.list(sale.sellerId, 1, 20);
      expect(buyerInbox.items.filter((row) => row.type === "PURCHASE_MADE")).toHaveLength(1);
      expect(sellerInbox.items.filter((row) => row.type === "SALE_MADE")).toHaveLength(1);
      expect(sellerInbox.items[0]?.body).toMatch(/Vendiste/);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });
});
