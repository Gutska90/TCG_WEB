import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../../src/common/errors/app-error";
import { backfillLedger } from "../../src/ledger/backfill";
import { LedgerAdjustmentService } from "../../src/ledger/ledger-adjustment.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import type { RequestUser } from "../../src/auth/request-user";
import { cleanupSale, createPendingSale } from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

const NET = 73_600;
const FEE = 6_400;

function actor(id: string, roles: RequestUser["roles"] = ["USER"]): RequestUser {
  return {
    id,
    email: "it@test.local",
    roles,
    sessionId: "it-session",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("Fase 10C ledger + payouts (postgres)", () => {
  const prisma = new PrismaService();
  const provider = new FakePaymentProvider();
  const { orders, refunds, ledger, balances, payouts, audit } = createMoneyServices(prisma, provider);
  const adjustments = new LedgerAdjustmentService(prisma, ledger, audit);

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
  });

  async function releasedSale() {
    const sale = await createPendingSale(prisma);
    await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });
    await prisma.order.update({
      where: { id: sale.orderId },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    await orders.confirm(actor(sale.buyerId), sale.orderId);
    return sale;
  }

  it("posts SELLER_PAYABLE and PLATFORM_FEE atomically on confirm and is idempotent", async () => {
    const sale = await releasedSale();
    try {
      const payable = await prisma.ledgerEntry.findMany({
        where: { orderId: sale.orderId, entryType: { in: ["SELLER_PAYABLE", "PLATFORM_FEE", "PAYMENT_CAPTURED"] } },
      });
      expect(payable.map((row) => row.entryType).sort()).toEqual([
        "PAYMENT_CAPTURED",
        "PLATFORM_FEE",
        "SELLER_PAYABLE",
      ]);
      expect(payable.find((row) => row.entryType === "SELLER_PAYABLE")?.amountClp).toBe(NET);
      expect(payable.find((row) => row.entryType === "PLATFORM_FEE")?.amountClp).toBe(FEE);

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
        await ledger.recordRelease(tx, {
          sellerId: sale.sellerId,
          orderId: sale.orderId,
          paymentId: payment.id,
          totalClp: 80_000,
          commissionClp: FEE,
        });
      });
      expect(await prisma.ledgerEntry.count({ where: { orderId: sale.orderId, entryType: "SELLER_PAYABLE" } })).toBe(1);
      expect(await prisma.ledgerEntry.count({ where: { orderId: sale.orderId, entryType: "PLATFORM_FEE" } })).toBe(1);

      const balance = await balances.forSeller(sale.sellerId);
      expect(balance.availableClp).toBe(NET);
      expect(balance.pendingClp).toBe(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("does not leave positive seller balance if refund lands before payable", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });
      await orders.cancel(actor(sale.buyerId), sale.orderId, { reason: "arrepentimiento" });
      const types = await prisma.ledgerEntry.findMany({ where: { orderId: sale.orderId } });
      expect(types.some((row) => row.entryType === "SELLER_PAYABLE")).toBe(false);
      expect(types.some((row) => row.entryType === "REFUND")).toBe(true);
      const balance = await balances.forSeller(sale.sellerId);
      expect(balance.availableClp).toBe(0);
      expect(balance.pendingClp).toBe(0);
      expect(balance.netClp).toBe(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("reduces available when refund completes after payable and before payout", async () => {
    const sale = await releasedSale();
    try {
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.create({
        data: { paymentId: payment.id, amountClp: payment.amountClp, reason: "post_release", status: "PENDING" },
      });
      await refunds.execute(refund.id);
      expect(await prisma.ledgerEntry.count({ where: { refundId: refund.id, entryType: "REFUND" } })).toBe(1);
      const balance = await balances.forSeller(sale.sellerId);
      expect(balance.availableClp).toBe(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("keeps seller debt visible after refund post PAID payout and blocks a new payout", async () => {
    const sale = await releasedSale();
    const adminUser = actor(sale.buyerId, ["ADMIN"]);
    try {
      const created = await payouts.create(adminUser, { sellerId: sale.sellerId, orderIds: [sale.orderId] });
      await payouts.approve(adminUser, created.id, {});
      await payouts.markProcessing(adminUser, created.id, {});
      await payouts.markPaid(adminUser, created.id, { providerRef: "BANCO-1" });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.create({
        data: { paymentId: payment.id, amountClp: payment.amountClp, reason: "post_payout", status: "PENDING" },
      });
      await refunds.execute(refund.id);
      const balance = await balances.forSeller(sale.sellerId);
      expect(balance.availableClp).toBe(-NET);
      expect(balance.paidClp).toBe(NET);
      expect(balance.netClp).toBe(-NET);
      await expect(payouts.create(adminUser, { sellerId: sale.sellerId })).rejects.toMatchObject({
        code: ERROR_CODES.INSUFFICIENT_SELLER_BALANCE,
      });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("only one concurrent payout can lock the same obligation", async () => {
    const sale = await releasedSale();
    const adminA = actor(sale.buyerId, ["ADMIN"]);
    const adminB = actor(sale.sellerId, ["ADMIN"]);
    try {
      const results = await Promise.allSettled([
        payouts.create(adminA, { sellerId: sale.sellerId, orderIds: [sale.orderId] }),
        payouts.create(adminB, { sellerId: sale.sellerId, orderIds: [sale.orderId] }),
      ]);
      const ok = results.filter((row) => row.status === "fulfilled");
      const failed = results.filter((row) => row.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      const err = (failed[0] as PromiseRejectedResult).reason as AppError;
      expect(err.code).toBe(ERROR_CODES.PAYOUT_UNAVAILABLE);
      expect(await prisma.payout.count({ where: { sellerId: sale.sellerId, status: "PENDING" } })).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("cancels a pending payout if a refund wins before approve", async () => {
    const sale = await releasedSale();
    const adminUser = actor(sale.buyerId, ["ADMIN"]);
    try {
      const created = await payouts.create(adminUser, { sellerId: sale.sellerId, orderIds: [sale.orderId] });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.create({
        data: { paymentId: payment.id, amountClp: payment.amountClp, reason: "before_approve", status: "PENDING" },
      });
      await refunds.execute(refund.id);
      const payout = await prisma.payout.findUniqueOrThrow({ where: { id: created.id } });
      expect(payout.status).toBe("CANCELLED");
      const item = await prisma.payoutItem.findFirst({ where: { payoutId: created.id } });
      expect(item?.locksOrder).toBe(false);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("does not cancel a PROCESSING payout when a refund arrives; seller debt stays visible", async () => {
    const sale = await releasedSale();
    const adminUser = actor(sale.buyerId, ["ADMIN"]);
    try {
      const created = await payouts.create(adminUser, { sellerId: sale.sellerId, orderIds: [sale.orderId] });
      await payouts.approve(adminUser, created.id, {});
      await payouts.markProcessing(adminUser, created.id, {});
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.create({
        data: { paymentId: payment.id, amountClp: payment.amountClp, reason: "during_processing", status: "PENDING" },
      });
      await refunds.execute(refund.id);
      const payout = await prisma.payout.findUniqueOrThrow({ where: { id: created.id } });
      expect(payout.status).toBe("PROCESSING");
      const balance = await balances.forSeller(sale.sellerId);
      expect(balance.availableClp).toBe(-NET);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("requires providerRef and refuses to mark PAID twice", async () => {
    const sale = await releasedSale();
    const adminUser = actor(sale.buyerId, ["ADMIN"]);
    try {
      const created = await payouts.create(adminUser, { sellerId: sale.sellerId, orderIds: [sale.orderId] });
      await payouts.approve(adminUser, created.id, {});
      await payouts.markProcessing(adminUser, created.id, {});
      await expect(payouts.markPaid(adminUser, created.id, { providerRef: "   " })).rejects.toMatchObject({
        code: ERROR_CODES.PAYOUT_PROVIDER_REF_REQUIRED,
      });
      await payouts.markPaid(adminUser, created.id, { providerRef: "TRX-9" });
      await expect(payouts.markPaid(adminUser, created.id, { providerRef: "TRX-10" })).rejects.toMatchObject({
        code: ERROR_CODES.PAYOUT_ILLEGAL_TRANSITION,
      });
      const paid = await prisma.payout.findUniqueOrThrow({ where: { id: created.id } });
      expect(paid.providerRef).toBe("TRX-9");
      expect(paid.paidAt).not.toBeNull();
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("blocks UPDATE on ledger_entries and duplicate REFUND rows", async () => {
    const sale = await releasedSale();
    try {
      const entry = await prisma.ledgerEntry.findFirstOrThrow({
        where: { orderId: sale.orderId, entryType: "SELLER_PAYABLE" },
      });
      await expect(
        prisma.ledgerEntry.update({ where: { id: entry.id }, data: { amountClp: 1 } }),
      ).rejects.toThrow(/append-only/i);

      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.create({
        data: { paymentId: payment.id, amountClp: payment.amountClp, reason: "dup", status: "PENDING" },
      });
      await refunds.execute(refund.id);
      await prisma.$transaction(async (tx) => {
        await ledger.recordRefund(tx, {
          sellerId: sale.sellerId,
          orderId: sale.orderId,
          paymentId: payment.id,
          refundId: refund.id,
          totalClp: 80_000,
          commissionClp: FEE,
        });
      });
      expect(await prisma.ledgerEntry.count({ where: { refundId: refund.id } })).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("allows ADJUSTMENT only for SUPER_ADMIN", async () => {
    const sale = await releasedSale();
    try {
      await expect(
        adjustments.create(actor(sale.buyerId, ["ADMIN"]), {
          sellerId: sale.sellerId,
          amountClp: -100,
          reason: "no debe pasar",
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN });
      const row = await adjustments.create(actor(sale.buyerId, ["SUPER_ADMIN"]), {
        sellerId: sale.sellerId,
        amountClp: -100,
        reason: "correccion ops",
      });
      expect(row.entryType).toBe("ADJUSTMENT");
      expect(row.amountClp).toBe(-100);
      const balance = await balances.forSeller(sale.sellerId);
      expect(balance.availableClp).toBe(NET - 100);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("backfill is idempotent", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });
      await prisma.order.update({
        where: { id: sale.orderId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await prisma.payment.update({
        where: { orderId: sale.orderId },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      const first = await backfillLedger(prisma, ledger);
      const second = await backfillLedger(prisma, ledger);
      expect(first.payableInserted).toBe(1);
      expect(first.feeInserted).toBe(1);
      expect(second.payableInserted).toBe(0);
      expect(second.feeInserted).toBe(0);
      expect(second.skippedDuplicates).toBeGreaterThan(0);
      expect(await prisma.ledgerEntry.count({ where: { orderId: sale.orderId, entryType: "SELLER_PAYABLE" } })).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("races payout create against refund without double paying", async () => {
    const sale = await releasedSale();
    const adminUser = actor(sale.buyerId, ["ADMIN"]);
    try {
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.create({
        data: { paymentId: payment.id, amountClp: payment.amountClp, reason: "race", status: "PENDING" },
      });
      const results = await Promise.allSettled([
        payouts.create(adminUser, { sellerId: sale.sellerId, orderIds: [sale.orderId] }),
        refunds.execute(refund.id),
      ]);
      expect(results.filter((row) => row.status === "fulfilled").length).toBeGreaterThanOrEqual(1);
      const live = await prisma.payoutItem.count({
        where: { orderId: sale.orderId, locksOrder: true, payout: { status: { in: ["PENDING", "APPROVED", "PROCESSING", "PAID"] } } },
      });
      expect(live).toBeLessThanOrEqual(1);
      if (live === 1) {
        const item = await prisma.payoutItem.findFirstOrThrow({
          where: { orderId: sale.orderId, locksOrder: true },
          include: { payout: true },
        });
        if (item.payout.status === "PAID") {
          throw new Error("race must not mark paid");
        }
      }
    } finally {
      await cleanupSale(prisma, sale);
    }
  });
});
