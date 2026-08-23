import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import type { RequestUser } from "../../src/auth/request-user";
import { AuditService } from "../../src/audit/audit.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { DisputesService } from "../../src/trust/disputes.service";
import { FilesService } from "../../src/files/files.service";
import { DeferredObjectStore } from "../../src/files/object-store";
import { ListingRevisionService } from "../../src/trust/listing-revision.service";
import { ModerationLogService } from "../../src/trust/moderation-log.service";
import { ModerationService } from "../../src/trust/moderation.service";
import { ReportsService } from "../../src/trust/reports.service";
import { MarketService } from "../../src/listings/market.service";
import { ListingsService } from "../../src/listings/listings.service";
import { RatingsService } from "../../src/ratings/ratings.service";
import { cleanupSale, createPendingSale } from "./helpers/market-fixture";
import { FakePaymentProvider } from "./helpers/fake-payment-provider";
import { createMoneyServices } from "./helpers/money-stack";
import { flagsForTest } from "../../src/flags/feature-flags.service";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function actor(id: string, roles: RequestUser["roles"]): RequestUser {
  return {
    id,
    email: "trust@test.local",
    roles,
    sessionId: "it-trust",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("Fase 10.5 trust (postgres)", () => {
  const prisma = new PrismaService();
  const provider = new FakePaymentProvider();
  const { orders, payouts, metrics } = createMoneyServices(prisma, provider);
  const audit = new AuditService(prisma);
  const revisions = new ListingRevisionService(prisma);
  const log = new ModerationLogService(prisma, audit);
  const files = new FilesService(prisma, new DeferredObjectStore());
  const disputes = new DisputesService(prisma, audit, revisions, log, payouts, metrics, files, {
    safeEmit: async () => undefined,
  } as never);
  const reports = new ReportsService(prisma, audit, log, metrics);
  const market = new MarketService(prisma);
  const flags = flagsForTest();
  const moderation = new ModerationService(prisma, revisions, log, market, flags);
  const listings = new ListingsService(prisma, market, audit, new RatingsService(prisma, audit, {
    safeEmit: async () => undefined,
  } as never), revisions, flags, {
    checkVariant: async () => ({ hits: 0, drops: 0 }),
  } as never);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function paidSale() {
    const sale = await createPendingSale(prisma);
    await orders.applyApproved(sale.checkoutId, `mp-${randomUUID()}`, { status: "approved" });
    const admin = await prisma.user.create({
      data: {
        email: `mod-${randomUUID().slice(0, 8)}@test.local`,
        displayName: "Mod",
        slug: `mod-${randomUUID().slice(0, 8)}`,
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "ADMIN" }, { role: "MODERATOR" }] },
      },
    });
    sale.extraUserIds.push(admin.id);
    return { sale, admin };
  }

  it("lets the buyer open a dispute on their order", async () => {
    const { sale } = await paidSale();
    try {
      const row = await disputes.open(actor(sale.buyerId, ["USER"]), sale.orderId, {
        reason: "ITEM_NOT_RECEIVED",
        description: "No ha llegado",
      });
      expect(row.status).toBe("OPEN");
      const order = await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } });
      expect(order.status).toBe("DISPUTED");
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("lets the seller open a dispute on their sale", async () => {
    const { sale } = await paidSale();
    try {
      const row = await disputes.open(actor(sale.sellerId, ["SELLER"]), sale.orderId, {
        reason: "OTHER",
      });
      expect(row.seller.id).toBe(sale.sellerId);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("404s a third party", async () => {
    const { sale } = await paidSale();
    try {
      await expect(
        disputes.open(actor(sale.extraUserIds[0] ?? sale.buyerId, ["USER"]), sale.orderId, {
          reason: "OTHER",
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("blocks a second active dispute", async () => {
    const { sale } = await paidSale();
    try {
      await disputes.open(actor(sale.buyerId, ["USER"]), sale.orderId, { reason: "DAMAGED" });
      await expect(
        disputes.open(actor(sale.sellerId, ["SELLER"]), sale.orderId, { reason: "OTHER" }),
      ).rejects.toMatchObject({ code: ERROR_CODES.DISPUTE_ALREADY_OPEN });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("posts a party message and hides internal notes", async () => {
    const { sale, admin } = await paidSale();
    try {
      const opened = await disputes.open(actor(sale.buyerId, ["USER"]), sale.orderId, {
        reason: "WRONG_ITEM",
      });
      await disputes.addMessage(actor(sale.sellerId, ["SELLER"]), opened.id, { body: "Revisaré el envío" });
      await disputes.addMessage(actor(admin.id, ["ADMIN"]), opened.id, {
        body: "nota interna",
        isInternalAdminNote: true,
      });
      const asBuyer = await disputes.get(actor(sale.buyerId, ["USER"]), opened.id);
      expect(asBuyer.messages.some((row) => row.isInternalAdminNote)).toBe(false);
      expect(asBuyer.messages.some((row) => row.body === "Revisaré el envío")).toBe(true);
      const asAdmin = await disputes.get(actor(admin.id, ["ADMIN"]), opened.id);
      expect(asAdmin.messages.some((row) => row.isInternalAdminNote)).toBe(true);
      expect(JSON.stringify(asBuyer)).not.toContain(admin.email);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("rejects evidence the actor does not own or with a bad MIME", async () => {
    const { sale } = await paidSale();
    try {
      const opened = await disputes.open(actor(sale.buyerId, ["USER"]), sale.orderId, { reason: "DAMAGED" });
      await expect(
        disputes.addEvidence(actor(sale.buyerId, ["USER"]), opened.id, {
          fileId: randomUUID(),
          evidenceType: "PHOTO",
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND });
      const file = await prisma.file.create({
        data: {
          bucket: "deferred",
          key: `ev/${randomUUID()}`,
          mime: "application/x-msdownload",
          size: 10,
          uploadedById: sale.buyerId,
          status: "READY",
        },
      });
      await expect(
        disputes.addEvidence(actor(sale.buyerId, ["USER"]), opened.id, {
          fileId: file.id,
          evidenceType: "OTHER",
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.FILE_NOT_ALLOWED });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("creates a listing report and blocks duplicates", async () => {
    const { sale } = await paidSale();
    try {
      const created = await reports.create(actor(sale.buyerId, ["USER"]), {
        targetType: "LISTING",
        targetId: sale.listingId,
        reason: "COUNTERFEIT",
      });
      expect(created.status).toBe("OPEN");
      await expect(
        reports.create(actor(sale.buyerId, ["USER"]), {
          targetType: "LISTING",
          targetId: sale.listingId,
          reason: "COUNTERFEIT",
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.REPORT_DUPLICATE });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("rate-limits reports from the same user", async () => {
    const { sale } = await paidSale();
    try {
      const reasons = [
        "COUNTERFEIT",
        "STOLEN_IMAGE",
        "SPAM",
        "MISLEADING_DESCRIPTION",
        "SCAM_SUSPECTED",
      ] as const;
      for (const reason of reasons) {
        await reports.create(actor(sale.buyerId, ["USER"]), {
          targetType: "LISTING",
          targetId: sale.listingId,
          reason,
        });
      }
      await expect(
        reports.create(actor(sale.buyerId, ["USER"]), {
          targetType: "LISTING",
          targetId: sale.listingId,
          reason: "ABUSIVE_CONTENT",
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.RATE_LIMITED });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("lets staff assign and resolve a dispute, writing AuditLog + ModerationAction", async () => {
    const { sale, admin } = await paidSale();
    try {
      const opened = await disputes.open(actor(sale.buyerId, ["USER"]), sale.orderId, { reason: "DAMAGED" });
      await disputes.assign(actor(admin.id, ["ADMIN"]), opened.id);
      const resolved = await disputes.resolve(actor(admin.id, ["ADMIN"]), opened.id, {
        outcome: "BUYER",
        note: "reembolso por ops, no automático",
      });
      expect(resolved.status).toBe("RESOLVED_BUYER");
      const payment = await prisma.payment.findUnique({ where: { orderId: sale.orderId } });
      expect(payment?.status).toBe("HELD");
      const actions = await prisma.moderationAction.findMany({ where: { targetId: opened.id } });
      expect(actions.map((row) => row.actionType).sort()).toEqual(["DISPUTE_ASSIGNED", "DISPUTE_RESOLVED"]);
      const audits = await prisma.auditLog.findMany({ where: { entityId: opened.id } });
      expect(audits.some((row) => row.action.startsWith("moderation."))).toBe(true);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("blocks a suspended seller from publishing and allows restore", async () => {
    const { sale, admin } = await paidSale();
    try {
      await moderation.suspendSeller(actor(admin.id, ["ADMIN"]), sale.sellerId, { reason: "fraude repetido" });
      await expect(
        listings.create(actor(sale.sellerId, ["USER", "SELLER"]), {
          variantId: sale.variantId,
          condition: "NM",
          quantity: 1,
          priceClp: 1000,
          imageFileIds: ["11111111-1111-4111-8111-111111111111"],
          allowsMeetup: true,
          allowsShipping: true,
        }),
      ).rejects.toMatchObject({ code: ERROR_CODES.SELLER_SUSPENDED });
      await moderation.restoreSeller(actor(admin.id, ["ADMIN"]), sale.sellerId, { reason: "revisado" });
      const order = await prisma.order.findUniqueOrThrow({ where: { id: sale.orderId } });
      expect(["PAID", "DISPUTED"]).toContain(order.status);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("pauses and restores a listing and keeps revisions append-only", async () => {
    const { sale, admin } = await paidSale();
    try {
      await prisma.listing.update({ where: { id: sale.listingId }, data: { status: "ACTIVE" } });
      await moderation.pauseListing(actor(admin.id, ["ADMIN"]), sale.listingId, { reason: "fotos dudosas" });
      const paused = await prisma.listing.findUniqueOrThrow({ where: { id: sale.listingId } });
      expect(paused.status).toBe("PAUSED");
      await moderation.restoreListing(actor(admin.id, ["ADMIN"]), sale.listingId, { reason: "ok" });
      const rev = await prisma.listingRevision.findFirstOrThrow({ where: { listingId: sale.listingId } });
      await expect(
        prisma.listingRevision.update({ where: { id: rev.id }, data: { reason: "hack" } }),
      ).rejects.toThrow(/append-only/i);
    } finally {
      await cleanupSale(prisma, sale);
    }
  });

  it("enforces RBAC: USER forbidden, MODERATOR can moderate, ADMIN can suspend", async () => {
    const { sale, admin } = await paidSale();
    try {
      const opened = await disputes.open(actor(sale.buyerId, ["USER"]), sale.orderId, { reason: "OTHER" });
      await expect(disputes.assign(actor(sale.buyerId, ["USER"]), opened.id)).rejects.toMatchObject({
        code: ERROR_CODES.FORBIDDEN,
      });
      const moderator = await prisma.user.create({
        data: {
          email: `only-mod-${randomUUID().slice(0, 8)}@test.local`,
          displayName: "OnlyMod",
          slug: `only-mod-${randomUUID().slice(0, 8)}`,
          emailVerifiedAt: new Date(),
          roles: { create: [{ role: "MODERATOR" }] },
        },
      });
      sale.extraUserIds.push(moderator.id);
      await disputes.assign(actor(moderator.id, ["MODERATOR"]), opened.id);
      await expect(
        moderation.suspendSeller(actor(moderator.id, ["MODERATOR"]), sale.sellerId, { reason: "no" }),
      ).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN });
      await moderation.suspendSeller(actor(admin.id, ["ADMIN"]), sale.sellerId, { reason: "admin sí" });
    } finally {
      await cleanupSale(prisma, sale);
    }
  });
});
