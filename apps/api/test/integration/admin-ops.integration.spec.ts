import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AdminOpsService } from "../../src/admin/admin-ops.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { flagsForTest } from "../../src/flags/feature-flags.service";
import { cleanupSale, createPendingSale } from "./helpers/market-fixture";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

describe("Admin 10A ops (postgres)", () => {
  const prisma = new PrismaService();
  const ops = new AdminOpsService(prisma, flagsForTest());

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for integration tests");
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("aggregates GMV/HELD and hides secrets in list DTOs", async () => {
    const sale = await createPendingSale(prisma);
    const paidAt = new Date();
    try {
      await prisma.user.update({
        where: { id: sale.buyerId },
        data: { passwordHash: "should-never-leak" },
      });
      await prisma.order.update({
        where: { id: sale.orderId },
        data: { status: "PAID", paidAt },
      });
      await prisma.payment.create({
        data: {
          orderId: sale.orderId,
          provider: "MERCADOPAGO",
          providerPaymentId: "mp-admin-it",
          status: "HELD",
          amountClp: 80_000,
          heldAt: paidAt,
          rawPayload: { secret: "mp-raw-must-not-leak", card: "4111" },
        },
      });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountClp: 80_000,
          reason: "it_pending",
          status: "PENDING",
        },
      });
      await prisma.payout.create({
        data: {
          sellerId: sale.sellerId,
          amountClp: 73_600,
          status: "PENDING",
          periodStart: paidAt,
          periodEnd: paidAt,
        },
      });
      await prisma.webhookEvent.create({
        data: {
          provider: "MERCADOPAGO",
          providerEventId: `it-admin-unprocessed-${sale.checkoutId}`,
          payload: { raw: true },
          createdAt: new Date(Date.now() - 120_000),
        },
      });
      await prisma.listing.update({
        where: { id: sale.listingId },
        data: { status: "SOLD" },
      });

      const dash = await ops.dashboard();
      expect(dash.money.gmvTodayClp).toBeGreaterThanOrEqual(80_000);
      expect(dash.money.amountHeldClp).toBeGreaterThanOrEqual(80_000);
      expect(dash.money.paymentsHeld).toBeGreaterThanOrEqual(1);
      expect(dash.money.pendingSellerHeldClp).toBeGreaterThanOrEqual(73_600);
      expect(dash.money.refundsPendingClp).toBeGreaterThanOrEqual(80_000);
      expect(dash.money.payoutsPendingClp).toBeGreaterThanOrEqual(73_600);
      expect(dash.operation.ordersPendingShipment).toBeGreaterThanOrEqual(1);
      expect(dash.alerts.some((row) => row.code === "anomalous_reservations" && row.count >= 1)).toBe(
        true,
      );
      expect(dash.alerts.some((row) => row.code === "webhooks_unprocessed" && row.count >= 1)).toBe(true);
      expect(JSON.stringify(dash)).not.toMatch(/should-never-leak|mp-raw-must-not-leak|passwordHash/);

      const users = await ops.listUsers({ page: 1, pageSize: 20, q: "buyer-" });
      const blob = JSON.stringify(users);
      expect(blob).not.toContain("should-never-leak");
      expect(blob).not.toContain("passwordHash");
      expect(users.items.some((row) => row.id === sale.buyerId)).toBe(true);

      const payments = await ops.listPayments({ page: 1, pageSize: 20, q: "mp-admin-it" });
      expect(payments.total).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(payments)).not.toContain("mp-raw-must-not-leak");
      expect(JSON.stringify(payments)).not.toContain("rawPayload");

      const page1 = await ops.listOrders({ page: 1, pageSize: 1 });
      expect(page1.items.length).toBe(1);
      expect(page1.pageSize).toBe(1);
      const disputed = await ops.listOrders({ page: 1, pageSize: 20, status: "DISPUTED" });
      expect(disputed.items.every((row) => row.status === "DISPUTED")).toBe(true);
    } finally {
      await prisma.payout.deleteMany({ where: { sellerId: sale.sellerId } });
      await prisma.webhookEvent.deleteMany({
        where: { providerEventId: `it-admin-unprocessed-${sale.checkoutId}` },
      });
      await prisma.listing.update({
        where: { id: sale.listingId },
        data: { status: "ACTIVE" },
      });
      await cleanupSale(prisma, sale);
    }
  });
});
