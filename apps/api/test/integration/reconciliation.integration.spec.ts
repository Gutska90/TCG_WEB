import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import type { RequestUser } from "../../src/auth/request-user";
import { AppError } from "../../src/common/errors/app-error";
import { PrismaService } from "../../src/prisma/prisma.service";
import { ReconciliationService, RECON_PROVIDER } from "../../src/reconciliation/reconciliation.service";
import { cleanupSale, createPendingSale } from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";
import { MetricsService } from "../../src/observability/metrics.service";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function actor(id: string, roles: RequestUser["roles"] = ["ADMIN"]): RequestUser {
  return {
    id,
    email: "recon-admin@test.local",
    roles,
    sessionId: "it-recon",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("Fase 10D reconciliation (postgres)", () => {
  const prisma = new PrismaService();
  const provider = new FakePaymentProvider();
  const { orders, audit } = createMoneyServices(prisma, provider);
  const recon = new ReconciliationService(prisma, audit, provider, new MetricsService());

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for integration tests");
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    provider.configured = true;
    provider.strictCatalog = true;
    provider.failSearch = false;
    provider.paymentStatus = "approved";
    provider.catalogPayments = [];
    provider.catalogRefunds = [];
    await prisma.reconciliationRun.updateMany({
      where: { provider: RECON_PROVIDER, status: "RUNNING" },
      data: { status: "FAILED", finishedAt: new Date() },
    });
  });

  async function withAdmin(sale: { extraUserIds: string[] }) {
    const admin = await prisma.user.create({
      data: {
        email: `recon-admin-${randomUUID().slice(0, 8)}@test.local`,
        displayName: "Recon Admin",
        slug: `recon-admin-${randomUUID().slice(0, 8)}`,
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "ADMIN" }] },
      },
    });
    sale.extraUserIds.push(admin.id);
    return admin;
  }

  async function heldSale() {
    const sale = await createPendingSale(prisma);
    const mpId = `mp-${randomUUID()}`;
    await orders.applyApproved(sale.checkoutId, mpId, { status: "approved" });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
    return { sale, payment, mpId };
  }

  function matchCatalog(input: {
    id: string;
    checkoutId: string;
    amountClp: number;
    status?: string;
  }) {
    provider.catalogPayments = [
      {
        id: input.id,
        status: input.status ?? "approved",
        amountClp: input.amountClp,
        externalReference: input.checkoutId,
        raw: { id: input.id },
      },
    ];
  }

  it("returns 0 issues when local, provider and ledger agree", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      const run = await recon.run(actor(admin.id), { hours: 48 });
      expect(run.status).toBe("COMPLETED");
      const aboutThisSale = await prisma.reconciliationIssue.findMany({
        where: { runId: run.id, entityId: payment.id },
      });
      expect(aboutThisSale).toHaveLength(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags provider payment missing locally", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      provider.catalogPayments = [
        {
          id: mpId,
          status: "approved",
          amountClp: payment.amountClp,
          externalReference: sale.checkoutId,
          raw: { id: mpId },
        },
        {
          id: `mp-missing-local-${randomUUID()}`,
          status: "approved",
          amountClp: 12_000,
          externalReference: sale.checkoutId,
          raw: {},
        },
      ];
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "PAYMENT_MISSING_LOCAL")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags local payment missing at the provider", async () => {
    const { sale } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      provider.catalogPayments = [];
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "PAYMENT_MISSING_PROVIDER")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags payment status mismatch", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({
        id: mpId,
        checkoutId: sale.checkoutId,
        amountClp: payment.amountClp,
        status: "refunded",
      });
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "PAYMENT_STATUS_MISMATCH")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags payment amount mismatch", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp - 1 });
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "PAYMENT_AMOUNT_MISMATCH")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags refund missing locally", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      provider.catalogRefunds = [
        { id: "rf-orphan", providerPaymentId: mpId, status: "approved", amountClp: payment.amountClp },
      ];
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "REFUND_MISSING_LOCAL")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags refund missing at the provider", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountClp: payment.amountClp,
          reason: "recon",
          status: "COMPLETED",
          providerRefundId: `rf-${randomUUID()}`,
        },
      });
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "REFUND_MISSING_PROVIDER")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags refund status mismatch", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      const refundId = `rf-${randomUUID()}`;
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountClp: payment.amountClp,
          reason: "recon",
          status: "FAILED",
          providerRefundId: refundId,
        },
      });
      provider.catalogRefunds = [
        { id: refundId, providerPaymentId: mpId, status: "approved", amountClp: payment.amountClp },
      ];
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "REFUND_STATUS_MISMATCH")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags refund amount mismatch", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      const refundId = `rf-${randomUUID()}`;
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountClp: payment.amountClp,
          reason: "recon",
          status: "COMPLETED",
          providerRefundId: refundId,
        },
      });
      provider.catalogRefunds = [
        { id: refundId, providerPaymentId: mpId, status: "approved", amountClp: 10 },
      ];
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "REFUND_AMOUNT_MISMATCH")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags missing PAYMENT_CAPTURED", async () => {
    const sale = await createPendingSale(prisma);
    const admin = await withAdmin(sale);
    const mpId = `mp-${randomUUID()}`;
    try {
      const payment = await prisma.payment.create({
        data: {
          orderId: sale.orderId,
          provider: "MERCADOPAGO",
          providerPaymentId: mpId,
          status: "HELD",
          amountClp: 80_000,
          heldAt: new Date(),
        },
      });
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "LEDGER_MISSING_PAYMENT_CAPTURED")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags missing SELLER_PAYABLE", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      await prisma.order.update({
        where: { id: sale.orderId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "LEDGER_MISSING_SELLER_PAYABLE")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags missing REFUND ledger entry", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      const refundId = `rf-${randomUUID()}`;
      await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountClp: payment.amountClp,
          reason: "recon",
          status: "COMPLETED",
          providerRefundId: refundId,
        },
      });
      provider.catalogRefunds = [
        { id: refundId, providerPaymentId: mpId, status: "approved", amountClp: payment.amountClp },
      ];
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "LEDGER_MISSING_REFUND")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("flags PAID payout without PAYOUT_PAID", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      await prisma.payout.create({
        data: {
          sellerId: sale.sellerId,
          amountClp: 73_600,
          status: "PAID",
          providerRef: "manual-it",
          periodStart: new Date(),
          periodEnd: new Date(),
          paidAt: new Date(),
        },
      });
      const run = await recon.run(actor(admin.id), { hours: 48 });
      const issues = await prisma.reconciliationIssue.findMany({ where: { runId: run.id } });
      expect(issues.some((row) => row.issueType === "PAYOUT_LEDGER_MISMATCH")).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("marks the run FAILED when the provider errors and does not complete", async () => {
    const { sale } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      provider.failSearch = true;
      const run = await recon.run(actor(admin.id), { hours: 48 });
      expect(run.status).toBe("FAILED");
      expect(run.issuesFound).toBe(0);
      expect(JSON.stringify(run)).not.toContain("MP_ACCESS_TOKEN");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("rejects a second concurrent run for the same provider", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    const blocker = await prisma.reconciliationRun.create({
      data: { provider: RECON_PROVIDER, status: "RUNNING" },
    });
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp });
      await expect(recon.run(actor(admin.id), { hours: 48 })).rejects.toMatchObject({
        code: ERROR_CODES.RECONCILIATION_IN_PROGRESS,
      } satisfies Partial<AppError>);
    } finally {
      await prisma.reconciliationRun.delete({ where: { id: blocker.id } });
      await cleanupSale(prisma, sale);
    }
  });

  it("acknowledge/resolve require ADMIN and do not auto-close on a later run", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp - 1 });
      const first = await recon.run(actor(admin.id), { hours: 48 });
      const issue = await prisma.reconciliationIssue.findFirstOrThrow({
        where: { runId: first.id, issueType: "PAYMENT_AMOUNT_MISMATCH" },
      });
      await expect(recon.acknowledge(actor(sale.buyerId, ["USER"]), issue.id)).rejects.toMatchObject({
        code: ERROR_CODES.FORBIDDEN,
      } satisfies Partial<AppError>);
      await recon.acknowledge(actor(admin.id), issue.id);
      const resolved = await recon.resolve(actor(admin.id), issue.id, { note: "revisado en MP sandbox" });
      expect(resolved.status).toBe("RESOLVED");

      const second = await recon.run(actor(admin.id), { hours: 48 });
      const open = await prisma.reconciliationIssue.count({
        where: { fingerprint: issue.fingerprint, status: "OPEN" },
      });
      expect(open).toBe(1);
      expect(second.issuesFound).toBeGreaterThan(0);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("reuses an OPEN issue instead of duplicating it", async () => {
    const { sale, payment, mpId } = await heldSale();
    const admin = await withAdmin(sale);
    try {
      matchCatalog({ id: mpId, checkoutId: sale.checkoutId, amountClp: payment.amountClp - 1 });
      await recon.run(actor(admin.id), { hours: 48 });
      await recon.run(actor(admin.id), { hours: 48 });
      const open = await prisma.reconciliationIssue.count({
        where: { issueType: "PAYMENT_AMOUNT_MISMATCH", status: "OPEN", providerPaymentId: mpId },
      });
      expect(open).toBe(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });
});
