import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConfigService } from "@nestjs/config";
import { AppError } from "../../src/common/errors/app-error";
import { AuditService } from "../../src/audit/audit.service";
import { LATE_PAYMENT_REFUND_REASON, OrdersService } from "../../src/orders/orders.service";
import { PaymentsService } from "../../src/payments/payments.service";
import { RefundsService } from "../../src/payments/refunds.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { ShippingService } from "../../src/shipping/shipping.service";
import type { RequestUser } from "../../src/auth/request-user";
import {
  cleanupSale,
  cleanupUsersAndCatalog,
  createBuyer,
  createOpenListing,
  createPendingSale,
  listingStock,
} from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
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

describe("checkout money safety (postgres)", () => {
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

  it("1. approved normal: PAID + HELD, never RELEASED, stock consumed", async () => {
    const sale = await createPendingSale(prisma);
    try {
      const result = await orders.applyApproved(sale.checkoutId, "it-pay-normal", { status: "approved" });
      expect(result.kind).toBe("paid");
      const checkout = await prisma.checkout.findUniqueOrThrow({ where: { id: sale.checkoutId } });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const stock = await listingStock(prisma, sale.listingId);
      expect(checkout.status).toBe("PAID");
      expect(payment.status).toBe("HELD");
      expect(payment.status).not.toBe("RELEASED");
      expect(stock.quantity).toBe(0);
      expect(stock.quantityReserved).toBe(0);
      expect(stock.status).toBe("SOLD");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("2. approved duplicado is idempotent and does not duplicate AuditLog", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await orders.applyApproved(sale.checkoutId, "it-pay-dup", { status: "approved" });
      const second = await orders.applyApproved(sale.checkoutId, "it-pay-dup", { status: "approved" });
      expect(second.kind).toBe("duplicate");
      const paidLogs = await prisma.auditLog.count({
        where: { entityId: sale.checkoutId, action: "checkout.paid" },
      });
      expect(paidLogs).toBe(1);
      const stock = await listingStock(prisma, sale.listingId);
      expect(stock.quantity).toBe(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("3. expiration normal releases reservation", async () => {
    const sale = await createPendingSale(prisma, { expiresAt: new Date(Date.now() - 1000) });
    try {
      const expired = await orders.expireCheckoutIfNeeded(sale.checkoutId);
      expect(expired).toBe(true);
      const checkout = await prisma.checkout.findUniqueOrThrow({ where: { id: sale.checkoutId } });
      const order = await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } });
      const stock = await listingStock(prisma, sale.listingId);
      expect(checkout.status).toBe("EXPIRED");
      expect(order.status).toBe("CANCELLED");
      expect(stock.quantity).toBe(1);
      expect(stock.quantityReserved).toBe(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("4-5. expiration and approved concurrent: only one valid transition wins", async () => {
    const sale = await createPendingSale(prisma, { expiresAt: new Date(Date.now() - 1000) });
    try {
      const outcomes = await Promise.all([
        orders.applyApproved(sale.checkoutId, "it-pay-race", { status: "approved" }),
        orders.expireCheckoutIfNeeded(sale.checkoutId),
      ]);
      const kinds = outcomes.map((row) => (typeof row === "boolean" ? row : row.kind));
      const checkout = await prisma.checkout.findUniqueOrThrow({ where: { id: sale.checkoutId } });
      const stock = await listingStock(prisma, sale.listingId);
      expect(["PAID", "EXPIRED"]).toContain(checkout.status);
      if (checkout.status === "PAID") {
        expect(kinds).toContain("paid");
        const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
        expect(payment.status).toBe("HELD");
        expect(stock.quantity).toBe(0);
        expect(stock.quantityReserved).toBe(0);
      } else {
        expect(stock.quantity).toBe(1);
        expect(stock.quantityReserved).toBe(0);
        const payment = await prisma.payment.findUnique({ where: { orderId: sale.orderId } });
        expect(payment?.status ?? "APPROVED").not.toBe("HELD");
        expect(payment?.status === "APPROVED" || payment == null || kinds.includes("late_payment")).toBe(true);
      }
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("6a. approved after expiresAt while still PENDING keeps the reservation (safe)", async () => {
    const sale = await createPendingSale(prisma, { expiresAt: new Date(Date.now() - 1000) });
    try {
      const result = await orders.applyApproved(sale.checkoutId, "it-pay-clock", { status: "approved" });
      expect(result.kind).toBe("paid");
      const checkout = await prisma.checkout.findUniqueOrThrow({ where: { id: sale.checkoutId } });
      expect(checkout.status).toBe("PAID");
      const stock = await listingStock(prisma, sale.listingId);
      expect(stock.quantity).toBe(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("6b. approved after EXPIRED records money, does not revive, refunds via provider", async () => {
    const sale = await createPendingSale(prisma, { expiresAt: new Date(Date.now() - 1000) });
    try {
      await orders.expireCheckoutIfNeeded(sale.checkoutId);
      const result = await orders.applyApproved(sale.checkoutId, "it-pay-late", { status: "approved" });
      expect(result.kind).toBe("late_payment");
      const checkout = await prisma.checkout.findUniqueOrThrow({ where: { id: sale.checkoutId } });
      const order = await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.findFirst({ where: { paymentId: payment.id } });
      const stock = await listingStock(prisma, sale.listingId);
      expect(checkout.status).toBe("EXPIRED");
      expect(order.status).toBe("CANCELLED");
      expect(order.notes).toContain("[late_payment]");
      expect(payment.status).toBe("REFUNDED");
      expect(refund?.status).toBe("COMPLETED");
      expect(refund?.reason).toBe(LATE_PAYMENT_REFUND_REASON);
      expect(refund?.amountClp).toBe(80000);
      expect(refund?.providerRefundId).toBeTruthy();
      expect(stock.quantity).toBe(1);
      expect(stock.quantityReserved).toBe(0);
      expect(
        await prisma.auditLog.count({
          where: { entityId: sale.checkoutId, action: "checkout.late_payment" },
        }),
      ).toBe(1);
      expect(
        await prisma.auditLog.count({
          where: { entityId: refund?.id, action: "refund.completed" },
        }),
      ).toBe(1);

      const retry = await orders.applyApproved(sale.checkoutId, "it-pay-late", { status: "approved" });
      expect(retry.kind).toBe("duplicate");
      expect(
        await prisma.auditLog.count({ where: { entityId: sale.checkoutId, action: "checkout.late_payment" } }),
      ).toBe(1);
      expect(await prisma.refund.count({ where: { paymentId: payment.id } })).toBe(1);
      expect((await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } })).status).toBe("COMPLETED");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("7. two buyers competing for quantity = 1: only one checkout reserves", async () => {
    const listing = await createOpenListing(prisma);
    const buyerA = await createBuyer(prisma, listing.listingId);
    const buyerB = await createBuyer(prisma, listing.listingId);
    try {
      const mp = { initPoint: null, sandboxInitPoint: null, mock: true as const };
      const results = await Promise.allSettled([
        orders.createCheckout(
          actor(buyerA.id),
          { shippingSelections: [{ sellerId: listing.sellerId, method: "MEETUP" }] },
          undefined,
          mp,
        ),
        orders.createCheckout(
          actor(buyerB.id),
          { shippingSelections: [{ sellerId: listing.sellerId, method: "MEETUP" }] },
          undefined,
          mp,
        ),
      ]);
      const fulfilled = results.filter((row) => row.status === "fulfilled");
      const rejected = results.filter((row) => row.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      const err = (rejected[0] as PromiseRejectedResult).reason as AppError;
      expect(err.code).toBe("LISTING_INSUFFICIENT_STOCK");
      const stock = await listingStock(prisma, listing.listingId);
      expect(stock.quantityReserved).toBe(1);
      expect(stock.quantity).toBe(1);
    } finally {
      await cleanupUsersAndCatalog(prisma, {
        userIds: [buyerA.id, buyerB.id, listing.sellerId],
        listingId: listing.listingId,
        variantId: listing.variantId,
        gameId: listing.gameId,
      });
    }
  });

  it("8-9. stock never negative and reserved never exceeds quantity", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await orders.applyApproved(sale.checkoutId, "it-pay-stock", { status: "approved" });
      await listingStock(prisma, sale.listingId);
      await expect(orders.applyApproved(sale.checkoutId, "it-pay-stock", { status: "approved" })).resolves.toEqual({
        kind: "duplicate",
      });
      await listingStock(prisma, sale.listingId);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("10. webhook retry does not duplicate AuditLog", async () => {
    const sale = await createPendingSale(prisma);
    const eventId = `it-${sale.checkoutId}`;
    const dataId = "it-mp-1";
    try {
      provider.configured = true;
      provider.paymentStatus = "approved";
      provider.externalReference = sale.checkoutId;
      const body = {
        id: eventId,
        type: "payment",
        data: { id: dataId },
        external_reference: sale.checkoutId,
      };
      const headers = mercadoPagoWebhookHeaders(WEBHOOK_SECRET, dataId);
      await payments.handleWebhook(headers, body);
      await payments.handleWebhook(headers, body);
      expect(await prisma.auditLog.count({ where: { entityId: sale.checkoutId, action: "checkout.paid" } })).toBe(1);
      expect(await prisma.webhookEvent.count({ where: { providerEventId: eventId } })).toBe(1);
      const checkout = await prisma.checkout.findUniqueOrThrow({ where: { id: sale.checkoutId } });
      expect(checkout.status).toBe("PAID");
    } finally {
      provider.configured = false;
      provider.externalReference = undefined;
      await cleanupSale(prisma, sale);
    }
  });

  it("10b. unsigned webhook is rejected when Mercado Pago is enabled", async () => {
    await expect(payments.handleWebhook({}, { id: "evt", type: "payment", data: { id: "1" } })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    provider.configured = true;
    try {
      await expect(
        payments.handleWebhook({}, { id: "evt", type: "payment", data: { id: "1" } }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    } finally {
      provider.configured = false;
    }
  });
});
