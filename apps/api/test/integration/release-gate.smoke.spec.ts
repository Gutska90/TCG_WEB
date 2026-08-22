import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { PaymentsService } from "../../src/payments/payments.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { mercadoPagoWebhookHeaders } from "../../src/payments/webhook-signature";
import type { RequestUser } from "../../src/auth/request-user";
import { cleanupSale, createPendingSale, listingStock } from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";

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

describe("9.5C release-gate smoke (postgres)", () => {
  const prisma = new PrismaService();
  const config = new ConfigService();
  const provider = new FakePaymentProvider();
  const { orders, refunds, audit, metrics } = createMoneyServices(prisma, provider);
  const payments = new PaymentsService(prisma, config, orders, audit, provider, refunds, metrics);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for integration tests");
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("checkout qty=1 → reserved → approved PAID → refund REFUNDED → stock back; duplicate webhook is a no-op", async () => {
    const sale = await createPendingSale(prisma);
    try {
      const reserved = await listingStock(prisma, sale.listingId);
      expect(reserved.quantity).toBe(1);
      expect(reserved.quantityReserved).toBe(1);

      provider.configured = true;
      provider.paymentStatus = "approved";
      provider.externalReference = sale.checkoutId;
      const dataId = `it-mp-smoke-${sale.orderId}`;
      const eventId = `it-evt-smoke-${sale.checkoutId}`;
      const body = {
        id: eventId,
        type: "payment",
        data: { id: dataId },
      };
      const headers = mercadoPagoWebhookHeaders(WEBHOOK_SECRET, dataId);

      await payments.handleWebhook(headers, body);
      await payments.handleWebhook(headers, body);

      const paid = await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const afterPay = await listingStock(prisma, sale.listingId);
      expect(paid.status).toBe("PAID");
      expect(payment.status).toBe("HELD");
      expect(afterPay.quantity).toBe(0);
      expect(afterPay.quantityReserved).toBe(0);
      expect(await prisma.payment.count({ where: { orderId: sale.orderId } })).toBe(1);
      expect(await prisma.auditLog.count({ where: { entityId: sale.checkoutId, action: "checkout.paid" } })).toBe(1);
      expect(await prisma.webhookEvent.count({ where: { providerEventId: eventId } })).toBe(1);

      const view = await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "smoke" });
      expect(view.status).toBe("REFUNDED");
      const refundedPayment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: refundedPayment.id } });
      const afterRefund = await listingStock(prisma, sale.listingId);
      expect(refundedPayment.status).toBe("REFUNDED");
      expect(refund.status).toBe("COMPLETED");
      expect(afterRefund.quantity).toBe(1);
      expect(await prisma.refund.count({ where: { paymentId: refundedPayment.id } })).toBe(1);

      provider.paymentStatus = "refunded";
      const refundEvent = {
        id: `it-evt-smoke-rf-${sale.checkoutId}`,
        type: "payment",
        data: { id: `${dataId}-rf` },
      };
      const refundHeaders = mercadoPagoWebhookHeaders(WEBHOOK_SECRET, `${dataId}-rf`);
      await payments.handleWebhook(refundHeaders, refundEvent);
      await payments.handleWebhook(refundHeaders, refundEvent);
      expect(await prisma.refund.count({ where: { paymentId: refundedPayment.id } })).toBe(1);
      expect((await listingStock(prisma, sale.listingId)).quantity).toBe(1);
      expect(await prisma.auditLog.count({ where: { entityId: refund.id, action: "refund.completed" } })).toBe(1);
    } finally {
      provider.configured = false;
      provider.externalReference = undefined;
      await cleanupSale(prisma, sale);
    }
  });
});
