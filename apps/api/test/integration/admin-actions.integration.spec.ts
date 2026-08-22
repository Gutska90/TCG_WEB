import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { AdminActionsService } from "../../src/admin/admin-actions.service";
import type { RequestUser } from "../../src/auth/request-user";
import { PrismaService } from "../../src/prisma/prisma.service";
import { cleanupSale, createPendingSale, listingStock } from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function admin(id: string): RequestUser {
  return {
    id,
    email: "admin-it@test.local",
    roles: ["ADMIN"],
    sessionId: "it-admin",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("Admin 10B actions (postgres)", () => {
  const prisma = new PrismaService();
  const provider = new FakePaymentProvider();
  const { orders, refunds, audit } = createMoneyServices(prisma, provider);
  const actions = new AdminActionsService(prisma, audit, orders, refunds);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for integration tests");
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    provider.configured = false;
    provider.paymentStatus = "approved";
    provider.refundBehavior = "ok";
    provider.refundCalls = 0;
  });

  it("hides secrets on order/payment detail", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await prisma.user.update({
        where: { id: sale.buyerId },
        data: { passwordHash: "should-never-leak" },
      });
      await orders.applyApproved(sale.checkoutId, `it-pay-${sale.orderId}`, {
        status: "approved",
        secret: "mp-raw-must-not-leak",
      });
      const detail = await actions.getOrder(sale.orderId);
      const blob = JSON.stringify(detail);
      expect(blob).not.toContain("should-never-leak");
      expect(blob).not.toContain("mp-raw-must-not-leak");
      expect(blob).not.toContain("passwordHash");
      expect(blob).not.toContain("rawPayload");
      expect(detail.payment).not.toBeNull();
      if (detail.payment) {
        const pay = await actions.getPayment(detail.payment.id);
        expect(JSON.stringify(pay)).not.toContain("mp-raw-must-not-leak");
        expect(JSON.stringify(pay)).not.toContain("rawPayload");
      }
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("cancels PENDING_PAYMENT and releases reserved stock", async () => {
    const sale = await createPendingSale(prisma);
    try {
      const before = await listingStock(prisma, sale.listingId);
      expect(before.quantityReserved).toBe(1);
      const view = await actions.cancelOrder(admin(sale.buyerId), sale.orderId, {
        reason: "admin_unpaid",
      });
      expect(view.status).toBe("CANCELLED");
      const stock = await listingStock(prisma, sale.listingId);
      expect(stock.quantityReserved).toBe(0);
      expect(stock.quantity).toBe(1);
      expect(
        await prisma.auditLog.count({
          where: { entityId: sale.orderId, action: "admin.order.cancel" },
        }),
      ).toBeGreaterThanOrEqual(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("cancels PAID via RefundsService and restores stock", async () => {
    const sale = await paidSale();
    try {
      const view = await actions.cancelOrder(admin(sale.buyerId), sale.orderId, {
        reason: "admin_paid_cancel",
      });
      expect(view.status).toBe("REFUNDED");
      expect(view.refunds[0]?.status).toBe("COMPLETED");
      expect(provider.refundCalls).toBe(1);
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("keeps PAID when provider refund fails; retry COMPLETED does not recall provider", async () => {
    const sale = await paidSale();
    try {
      provider.refundBehavior = "timeout";
      await expect(
        actions.cancelOrder(admin(sale.buyerId), sale.orderId, { reason: "admin_timeout" }),
      ).rejects.toMatchObject({ code: ERROR_CODES.REFUND_PROVIDER_ERROR });
      const order = await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(order.status).toBe("PAID");
      expect(payment.status).toBe("HELD");
      expect(refund.status).toBe("FAILED");
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(0);

      const failedDetail = await actions.getRefund(refund.id);
      expect(failedDetail.lastError).toBe("timeout");

      provider.refundBehavior = "ok";
      const first = await actions.retryRefund(admin(sale.buyerId), refund.id);
      expect(first.outcome).toBe("completed");
      expect(first.providerCalled).toBe(true);
      expect(provider.refundCalls).toBe(2);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe(
        "REFUNDED",
      );

      const second = await actions.retryRefund(admin(sale.buyerId), refund.id);
      expect(second.outcome).toBe("completed");
      expect(second.providerCalled).toBe(false);
      expect(provider.refundCalls).toBe(2);
      expect(
        await prisma.auditLog.count({
          where: { entityId: refund.id, action: "admin.refund.retry" },
        }),
      ).toBeGreaterThanOrEqual(2);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("rejects illegal cancel of SHIPPED with ORDER_ILLEGAL_TRANSITION", async () => {
    const sale = await paidSale();
    try {
      await prisma.order.update({ where: { id: sale.orderId }, data: { status: "SHIPPED" } });
      await expect(
        actions.cancelOrder(admin(sale.buyerId), sale.orderId, { reason: "too_late" }),
      ).rejects.toMatchObject({
        code: ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
        status: 409,
      });
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe(
        "SHIPPED",
      );
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  async function paidSale() {
    const sale = await createPendingSale(prisma);
    await orders.applyApproved(sale.checkoutId, `it-pay-${sale.orderId}`, { status: "approved" });
    return sale;
  }
});
