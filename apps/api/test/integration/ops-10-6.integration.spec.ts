import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import type { RequestUser } from "../../src/auth/request-user";
import { AdminOpsService } from "../../src/admin/admin-ops.service";
import { flagsForTest } from "../../src/flags/feature-flags.service";
import { JobRunner } from "../../src/jobs/job-runner";
import { JobsService } from "../../src/jobs/jobs.service";
import { ErrorTrackingService } from "../../src/observability/error-tracking.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { DisputesService } from "../../src/trust/disputes.service";
import { FilesService } from "../../src/files/files.service";
import { DeferredObjectStore } from "../../src/files/object-store";
import { ListingRevisionService } from "../../src/trust/listing-revision.service";
import { ModerationLogService } from "../../src/trust/moderation-log.service";
import { ModerationService } from "../../src/trust/moderation.service";
import { MarketService } from "../../src/listings/market.service";
import { cleanupSale, createPendingSale } from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function actor(id: string, roles: RequestUser["roles"] = ["USER"]): RequestUser {
  return {
    id,
    email: "ops106@test.local",
    roles,
    sessionId: "it-106",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("Fase 10.6 ops safety (postgres)", () => {
  const prisma = new PrismaService();
  const provider = new FakePaymentProvider();
  const money = createMoneyServices(prisma, provider);
  const { orders, payouts, refunds, balances, audit, metrics } = money;
  const flags = flagsForTest({ enablePayouts: true, refundRetryJobEnabled: true });
  const errors = new ErrorTrackingService(flags);
  const runner = new JobRunner(prisma, errors);
  const jobs = new JobsService(
    runner,
    prisma,
    flags,
    orders,
    refunds,
    { run: async () => ({ id: "recon", status: "COMPLETED" }) } as never,
    { captureDay: async () => ({ listings: 0, sales: 0 }) } as never,
    { captureDailyValues: async () => ({ collections: 0 }) } as never,
    { scanAll: async () => ({ variants: 0, hits: 0, drops: 0 }) } as never,
    { expireOpen: async () => ({ expired: 0 }) } as never,
  );
  const revisions = new ListingRevisionService(prisma);
  const log = new ModerationLogService(prisma, audit);
  const files = new FilesService(prisma, new DeferredObjectStore());
  const disputes = new DisputesService(prisma, audit, revisions, log, payouts, metrics, files, {
    safeEmit: async () => undefined,
  } as never);
  const moderation = new ModerationService(prisma, revisions, log, new MarketService(prisma), flags);
  const ops = new AdminOpsService(prisma, flags);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function releasedSale() {
    const sale = await createPendingSale(prisma);
    await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });
    await prisma.order.update({
      where: { id: sale.orderId },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    await orders.confirm(actor(sale.buyerId), sale.orderId);
    const admin = await prisma.user.create({
      data: {
        email: `ops-${randomUUID().slice(0, 8)}@test.local`,
        displayName: "Ops",
        slug: `ops-${randomUUID().slice(0, 8)}`,
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "ADMIN" }, { role: "SUPER_ADMIN" }] },
      },
    });
    sale.extraUserIds.push(admin.id);
    return { sale, admin };
  }

  it("excludes disputed payable from availableClp and new payouts", async () => {
    const { sale, admin } = await releasedSale();
    try {
      const before = await balances.forSeller(sale.sellerId);
      expect(before.availableClp).toBeGreaterThan(0);
      await disputes.open(actor(sale.buyerId), sale.orderId, { reason: "OTHER" });
      const after = await balances.forSeller(sale.sellerId);
      expect(after.availableClp).toBe(0);
      expect(after.disputedClp).toBe(before.availableClp);
      await expect(payouts.create(actor(admin.id, ["ADMIN"]), { sellerId: sale.sellerId })).rejects.toMatchObject({
        code: ERROR_CODES.PAYOUT_UNAVAILABLE,
      });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("cancels PENDING and APPROVED payouts when a dispute opens", async () => {
    const { sale, admin } = await releasedSale();
    try {
      const pending = await payouts.create(actor(admin.id, ["ADMIN"]), { sellerId: sale.sellerId });
      expect(pending.status).toBe("PENDING");
      await disputes.open(actor(sale.buyerId), sale.orderId, { reason: "DAMAGED" });
      const cancelled = await prisma.payout.findUniqueOrThrow({ where: { id: pending.id } });
      expect(cancelled.status).toBe("CANCELLED");

      const sale2 = await releasedSale();
      try {
        const created = await payouts.create(actor(admin.id, ["ADMIN"]), { sellerId: sale2.sale.sellerId });
        await payouts.approve(actor(admin.id, ["ADMIN"]), created.id, { reason: "ok" });
        await disputes.open(actor(sale2.sale.buyerId), sale2.sale.orderId, { reason: "OTHER" });
        const after = await prisma.payout.findUniqueOrThrow({ where: { id: created.id } });
        expect(after.status).toBe("CANCELLED");
      } finally {
        await cleanupSale(prisma, sale2.sale);
      }
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("does not mutate PROCESSING or PAID payouts when a dispute opens", async () => {
    const { sale, admin } = await releasedSale();
    try {
      const created = await payouts.create(actor(admin.id, ["ADMIN"]), { sellerId: sale.sellerId });
      await payouts.approve(actor(admin.id, ["ADMIN"]), created.id, { reason: "ok" });
      await payouts.markProcessing(actor(admin.id, ["ADMIN"]), created.id, { reason: "banco" });
      await disputes.open(actor(sale.buyerId), sale.orderId, { reason: "OTHER" });
      const processing = await prisma.payout.findUniqueOrThrow({ where: { id: created.id } });
      expect(processing.status).toBe("PROCESSING");
    } finally {
      await cleanupSale(prisma, sale);
    }

    const paidCase = await releasedSale();
    try {
      const created = await payouts.create(actor(paidCase.admin.id, ["ADMIN"]), {
        sellerId: paidCase.sale.sellerId,
      });
      await payouts.approve(actor(paidCase.admin.id, ["ADMIN"]), created.id, { reason: "ok" });
      await payouts.markProcessing(actor(paidCase.admin.id, ["ADMIN"]), created.id, { reason: "banco" });
      await payouts.markPaid(actor(paidCase.admin.id, ["ADMIN"]), created.id, {
        providerRef: `manual-${randomUUID()}`,
        reason: "pagado",
      });
      await disputes.open(actor(paidCase.sale.buyerId), paidCase.sale.orderId, { reason: "OTHER" });
      const paid = await prisma.payout.findUniqueOrThrow({ where: { id: created.id } });
      expect(paid.status).toBe("PAID");
    } finally {
      await cleanupSale(prisma, paidCase.sale);
    }
  });

  it("re-enables the obligation after the dispute is resolved", async () => {
    const { sale, admin } = await releasedSale();
    try {
      const opened = await disputes.open(actor(sale.buyerId), sale.orderId, { reason: "OTHER" });
      await disputes.resolve(actor(admin.id, ["ADMIN"]), opened.id, {
        outcome: "SELLER",
        note: "sin cargo al seller",
      });
      const balance = await balances.forSeller(sale.sellerId);
      expect(balance.disputedClp).toBe(0);
      expect(balance.availableClp).toBeGreaterThan(0);
      const payout = await payouts.create(actor(admin.id, ["ADMIN"]), { sellerId: sale.sellerId });
      expect(payout.status).toBe("PENDING");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("auto-pauses ACTIVE listings on suspend and does not reactivate on restore", async () => {
    const { sale, admin } = await releasedSale();
    let extraListingId: string | undefined;
    try {
      const listing = await prisma.listing.create({
        data: {
          sellerId: sale.sellerId,
          variantId: sale.variantId,
          productType: "SINGLE",
          title: "Extra",
          condition: "NM",
          quantity: 1,
          priceClp: 1000,
          status: "ACTIVE",
          allowsMeetup: true,
          allowsShipping: true,
          publishedAt: new Date(),
        },
      });
      extraListingId = listing.id;
      await moderation.suspendSeller(actor(admin.id, ["ADMIN"]), sale.sellerId, { reason: "fraude" });
      const paused = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
      expect(paused.status).toBe("PAUSED");
      const action = await prisma.moderationAction.findFirst({
        where: { targetId: listing.id, actionType: "LISTING_PAUSED" },
      });
      expect(action).toBeTruthy();
      await moderation.restoreSeller(actor(admin.id, ["ADMIN"]), sale.sellerId, { reason: "ok" });
      const still = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
      expect(still.status).toBe("PAUSED");
    } finally {
      if (extraListingId) {
        await prisma.listingRevision.deleteMany({ where: { listingId: extraListingId } });
        await prisma.listing.deleteMany({ where: { id: extraListingId } });
      }
      await cleanupSale(prisma, sale);
    }
  });

  it("serves evidence to parties and 404s IDOR", async () => {
    const { sale, admin } = await releasedSale();
    try {
      const opened = await disputes.open(actor(sale.buyerId), sale.orderId, { reason: "DAMAGED" });
      const file = await prisma.file.create({
        data: {
          bucket: "deferred",
          key: `ev/${randomUUID()}`,
          mime: "image/jpeg",
          size: 12,
          uploadedById: sale.buyerId,
          status: "READY",
        },
      });
      const evidence = await disputes.addEvidence(actor(sale.buyerId), opened.id, {
        fileId: file.id,
        evidenceType: "PHOTO",
      });
      await expect(
        disputes.streamEvidenceFile(actor(sale.buyerId), opened.id, evidence.id),
      ).rejects.toMatchObject({ code: ERROR_CODES.FILE_NOT_STORED });
      await expect(
        disputes.streamEvidenceFile(actor(sale.sellerId, ["SELLER"]), opened.id, evidence.id),
      ).rejects.toMatchObject({ code: ERROR_CODES.FILE_NOT_STORED });
      await expect(
        disputes.streamEvidenceFile(actor(admin.id, ["ADMIN"]), opened.id, evidence.id),
      ).rejects.toMatchObject({ code: ERROR_CODES.FILE_NOT_STORED });
      const stranger = await prisma.user.create({
        data: {
          email: `str-${randomUUID().slice(0, 8)}@test.local`,
          displayName: "Str",
          slug: `str-${randomUUID().slice(0, 8)}`,
          roles: { create: [{ role: "USER" }] },
        },
      });
      sale.extraUserIds.push(stranger.id);
      await expect(
        disputes.streamEvidenceFile(actor(stranger.id), opened.id, evidence.id),
      ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("skips a second concurrent run of the same job", async () => {
    const name = `lock-${randomUUID()}`;
    let release!: () => void;
    const gate = new Promise<void>((resolveGate) => {
      release = resolveGate;
    });
    const first = runner.run(name, () => gate.then(() => ({ ok: true })));
    await prisma.$transaction(async () => {
      for (let i = 0; i < 20; i += 1) {
        const running = await prisma.jobRun.findFirst({ where: { jobName: name, status: "RUNNING" } });
        if (running) break;
        await new Promise((r) => setTimeout(r, 25));
      }
    });
    const second = await runner.run(name, async () => ({ ok: false }));
    expect(second.status).toBe("SKIPPED");
    release();
    const done = await first;
    expect(done.status).toBe("COMPLETED");
  });

  it("retries refunds idempotently without duplicating provider calls", async () => {
    const sale = await createPendingSale(prisma);
    try {
      await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });
      const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          amountClp: payment.amountClp,
          reason: "test_retry",
          status: "FAILED",
        },
      });
      await prisma.$executeRaw`UPDATE refunds SET updated_at = ${new Date(Date.now() - 86_400_000)} WHERE id = ${refund.id}::uuid`;
      const run = await jobs.refundRetry();
      expect(["COMPLETED", "SKIPPED"]).toContain(run.status);
      await jobs.refundRetry();
      const rows = await prisma.refund.findMany({ where: { paymentId: payment.id } });
      expect(rows).toHaveLength(1);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("surfaces a FAILED job in admin alerts", async () => {
    await prisma.jobRun.create({
      data: {
        jobName: `fail-${randomUUID()}`,
        status: "FAILED",
        startedAt: new Date(),
        finishedAt: new Date(),
        durationMs: 10,
        errorCode: "JOB_FAILED",
        errorMessage: "boom",
      },
    });
    const dash = await ops.dashboard();
    expect(dash.alerts.some((row) => row.code === "jobs_failed")).toBe(true);
    const system = await ops.system();
    expect(system.api).toBe("ok");
    expect(system.lastJobs.length).toBeGreaterThan(0);
  });

  it("kill-switches checkout and payouts", async () => {
    const blockedCheckout = flagsForTest({ disableCheckout: true });
    expect(() => blockedCheckout.assertCheckoutAllowed()).toThrow();
    money.flags.use(flagsForTest({ disablePayouts: true }).current());
    const { sale, admin } = await releasedSale();
    try {
      await expect(payouts.create(actor(admin.id, ["ADMIN"]), { sellerId: sale.sellerId })).rejects.toMatchObject({
        code: ERROR_CODES.SERVICE_TEMPORARILY_DISABLED,
      });
    } finally {
      money.flags.use(flagsForTest({ enablePayouts: true }).current());
      await cleanupSale(prisma, sale);
    }
  });
});
