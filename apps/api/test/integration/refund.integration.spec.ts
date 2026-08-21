import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { ERROR_CODES } from "@tcg/config";
import { cancelOrderSchema } from "@tcg/validation";
import { AuditService } from "../../src/audit/audit.service";
import { LATE_PAYMENT_REFUND_REASON, OrdersService } from "../../src/orders/orders.service";
import { PaymentsService } from "../../src/payments/payments.service";
import { RefundsService } from "../../src/payments/refunds.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { ShippingService } from "../../src/shipping/shipping.service";
import type { RequestUser } from "../../src/auth/request-user";
import { cleanupSale, createPendingSale, listingStock } from "./helpers/market-fixture";
import { FakePaymentProvider, MP_ALREADY_REFUNDED_FIXTURE } from "./helpers/fake-payment-provider";
import { mercadoPagoWebhookHeaders } from "../../src/payments/webhook-signature";

const WEBHOOK_SECRET = "it-webhook-secret-not-a-placeholder-32";

loadEnv({ path: resolve(__dirname, "../../../../.env") });
process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET;

function actor(id: string): RequestUser {
  return {
    id,
    email: "it@test.local",
    roles: ["USER"],
    sessionId: "it-session",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("P0-3 refunds (postgres)", () => {
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const shipping = new ShippingService(prisma);
  const config = new ConfigService();
  const provider = new FakePaymentProvider();
  const refunds = new RefundsService(prisma, audit, provider);
  const orders = new OrdersService(prisma, audit, shipping, refunds);
  const payments = new PaymentsService(prisma, config, orders, audit, provider, refunds);

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
    provider.externalReference = undefined;
    provider.refundBehavior = "ok";
    provider.refundCalls = 0;
    provider.lastAmountClp = undefined;
    provider.lastIdempotencyKey = undefined;
  });

  it("successful refund on cancel of PAID order restores stock after provider approval", async () => {
    const sale = await paidSale();
    try {
      const view = await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "arrepentimiento" });
      expect(view.status).toBe("REFUNDED");
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      const stock = await listingStock(prisma, sale.listingId);
      expect(payment.status).toBe("REFUNDED");
      expect(refund.status).toBe("COMPLETED");
      expect(refund.amountClp).toBe(payment.amountClp);
      expect(refund.providerRefundId).toBe(`mock_rf_${refund.id}`);
      expect(stock.quantity).toBe(1);
      expect(provider.refundCalls).toBe(1);
      expect(provider.lastAmountClp).toBe(payment.amountClp);
      expect(
        await prisma.auditLog.count({ where: { entityId: refund.id, action: "refund.requested" } }),
      ).toBe(1);
      expect(
        await prisma.auditLog.count({ where: { entityId: refund.id, action: "refund.completed" } }),
      ).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("duplicate refund does not call the provider twice", async () => {
    const sale = await paidSale();
    try {
      await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "dup-1" });
      await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "dup-2" });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      expect(await prisma.refund.count({ where: { paymentId: payment.id } })).toBe(1);
      expect(provider.refundCalls).toBe(1);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe("REFUNDED");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("retries a failed provider refund and completes on the second attempt", async () => {
    const sale = await paidSale();
    try {
      provider.refundBehavior = "fail_once";
      await expect(orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "retry" })).rejects.toMatchObject({
        code: ERROR_CODES.REFUND_PROVIDER_ERROR,
      });
      let payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      let refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(payment.status).toBe("HELD");
      expect(refund.status).toBe("FAILED");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe("PAID");
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(0);
      expect(
        await prisma.auditLog.count({ where: { entityId: refund.id, action: "refund.failed" } }),
      ).toBe(1);

      await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "retry" });
      payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(payment.status).toBe("REFUNDED");
      expect(refund.status).toBe("COMPLETED");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe("REFUNDED");
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(1);
      expect(provider.refundCalls).toBe(2);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("timeout leaves Refund FAILED and does not mark Order REFUNDED", async () => {
    const sale = await paidSale();
    try {
      provider.refundBehavior = "timeout";
      await expect(orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "timeout" })).rejects.toMatchObject({
        code: ERROR_CODES.REFUND_PROVIDER_ERROR,
      });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(payment.status).toBe("HELD");
      expect(refund.status).toBe("FAILED");
      expect(refund.providerRefundId).toBeNull();
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe("PAID");
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("provider HTTP error does not mark Order REFUNDED", async () => {
    const sale = await paidSale();
    try {
      provider.refundBehavior = "http";
      await expect(orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "http" })).rejects.toMatchObject({
        code: ERROR_CODES.REFUND_PROVIDER_ERROR,
      });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      expect(payment.status).not.toBe("REFUNDED");
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe("PAID");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("late payment refunds the captured Mercado Pago payment", async () => {
    const sale = await createPendingSale(prisma, { expiresAt: new Date(Date.now() - 1000) });
    try {
      await orders.expireCheckoutIfNeeded(sale.checkoutId);
      await orders.applyApproved(sale.checkoutId, "it-pay-late-p03", { status: "approved" });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(payment.status).toBe("REFUNDED");
      expect(refund.status).toBe("COMPLETED");
      expect(refund.reason).toBe(LATE_PAYMENT_REFUND_REASON);
      expect((await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } })).status).toBe("CANCELLED");
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(1);
      expect(provider.refundCalls).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("ignores a client-manipulated amount and refunds the persisted Payment amount", async () => {
    const parsed = cancelOrderSchema.parse({ reason: "monto", amountClp: 1 });
    expect(parsed).toEqual({ reason: "monto" });

    const sale = await paidSale();
    try {
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      await orders.cancel(actor(sale.buyerId), sale.orderId, {
        reason: "monto",
        amountClp: 1,
      } as { reason: string; amountClp: number });
      expect(provider.lastAmountClp).toBe(payment.amountClp);
      expect(provider.lastAmountClp).not.toBe(1);
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(refund.amountClp).toBe(payment.amountClp);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("uses Payment.amountClp even if the Refund row was tampered", async () => {
    const sale = await paidSale();
    try {
      provider.refundBehavior = "timeout";
      await expect(orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "tamper" })).rejects.toMatchObject({
        code: ERROR_CODES.REFUND_PROVIDER_ERROR,
      });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      await prisma.refund.update({ where: { id: refund.id }, data: { amountClp: 1 } });
      provider.refundBehavior = "ok";
      await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "tamper" });
      expect(provider.lastAmountClp).toBe(payment.amountClp);
      expect(provider.lastAmountClp).not.toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("duplicate refunded webhook after refund does not restore stock twice", async () => {
    const sale = await paidSale();
    try {
      await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "wh" });
      provider.configured = true;
      provider.paymentStatus = "refunded";
      provider.externalReference = sale.checkoutId;
      const body = {
        id: `it-rf-${sale.checkoutId}`,
        type: "payment",
        data: { id: "it-mp-refunded" },
        fixture: MP_ALREADY_REFUNDED_FIXTURE,
      };
      const headers = mercadoPagoWebhookHeaders(WEBHOOK_SECRET, "it-mp-refunded");
      await payments.handleWebhook(headers, body);
      await payments.handleWebhook(headers, body);
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      expect(payment.status).toBe("REFUNDED");
      expect(await prisma.refund.count({ where: { paymentId: payment.id } })).toBe(1);
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("already-refunded provider response completes a single local refund", async () => {
    const sale = await paidSale();
    try {
      provider.refundBehavior = "already_refunded";
      await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "already" });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
      expect(refund.status).toBe("COMPLETED");
      expect(refund.providerRefundId).toBe("9001");
      expect(payment.status).toBe("REFUNDED");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("blocks prepare while a refund is FAILED", async () => {
    const sale = await paidSale();
    try {
      provider.refundBehavior = "timeout";
      await expect(orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "block" })).rejects.toMatchObject({
        code: ERROR_CODES.REFUND_PROVIDER_ERROR,
      });
      await expect(orders.prepare(actor(sale.sellerId), sale.orderId)).rejects.toMatchObject({
        code: ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
      });
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
