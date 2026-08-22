import { Injectable } from "@nestjs/common";
import { PLATFORM } from "@tcg/config";
import type { JobRunView } from "@tcg/types";
import { CollectionsService } from "../collections/collections.service";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { OrdersService } from "../orders/orders.service";
import { RefundsService } from "../payments/refunds.service";
import { PrismaService } from "../prisma/prisma.service";
import { PricesService } from "../prices/prices.service";
import { WishlistService } from "../wishlist/wishlist.service";
import { ReconciliationService } from "../reconciliation/reconciliation.service";
import { JobRunner } from "./job-runner";

const REFUND_RETRY_ACTIONS = ["refund.failed", "refund.retry"];

@Injectable()
export class JobsService {
  constructor(
    private readonly runner: JobRunner,
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly orders: OrdersService,
    private readonly refunds: RefundsService,
    private readonly recon: ReconciliationService,
    private readonly prices: PricesService,
    private readonly collections: CollectionsService,
    private readonly wishlist: WishlistService,
  ) {}

  expireCheckouts(): Promise<JobRunView> {
    return this.runner.run("expire-checkouts", async () => {
      const rows = await this.prisma.checkout.findMany({
        where: { status: "PENDING_PAYMENT", expiresAt: { lte: new Date() } },
        select: { id: true },
        take: 200,
      });
      let expired = 0;
      for (const row of rows) {
        if (await this.orders.expireCheckoutIfNeeded(row.id)) expired += 1;
      }
      return { scanned: rows.length, expired };
    });
  }

  housekeeping(): Promise<JobRunView> {
    return this.runner.run("housekeeping", async () => {
      const stale = await this.runner.failStale(PLATFORM.jobStaleMinutes * 60_000);
      return { staleJobs: stale };
    });
  }

  reconciliation(): Promise<JobRunView> {
    return this.runner.run("reconciliation", async () => {
      const run = await this.recon.run(null, {});
      return { reconRunId: run.id, status: run.status };
    });
  }

  refundRetry(): Promise<JobRunView> {
    return this.runner.run("refund-retry", async () => {
      if (!this.flags.refundsAutomationAllowed()) {
        return { skipped: true, reason: "refunds_automation_disabled" };
      }
      const candidates = await this.prisma.refund.findMany({
        where: { status: { in: ["PENDING", "FAILED"] } },
        select: { id: true, createdAt: true, updatedAt: true },
        take: 50,
        orderBy: { updatedAt: "asc" },
      });
      let retried = 0;
      let skipped = 0;
      for (const row of candidates) {
        const attempts = await this.prisma.auditLog.count({
          where: { entityType: "Refund", entityId: row.id, action: { in: REFUND_RETRY_ACTIONS } },
        });
        if (attempts >= PLATFORM.refundRetryMaxAttempts) {
          skipped += 1;
          continue;
        }
        const waitMs = PLATFORM.refundRetryBackoffMinutes * 60_000 * Math.max(1, attempts);
        if (Date.now() - row.updatedAt.getTime() < waitMs) {
          skipped += 1;
          continue;
        }
        await this.prisma.auditLog.create({
          data: {
            action: "refund.retry",
            entityType: "Refund",
            entityId: row.id,
            metadata: { attempt: attempts + 1 },
          },
        });
        await this.refunds.execute(row.id);
        retried += 1;
      }
      return { candidates: candidates.length, retried, skipped };
    });
  }

  cardPrices(): Promise<JobRunView> {
    return this.runner.run("card-prices", async () => {
      if (!this.flags.current().enablePrices) {
        return { skipped: true, reason: "prices_disabled" };
      }
      return this.prices.captureDay();
    });
  }

  collectionValue(): Promise<JobRunView> {
    return this.runner.run("collection-value", async () => {
      if (!this.flags.current().enableCollections) {
        return { skipped: true, reason: "collections_disabled" };
      }
      return this.collections.captureDailyValues();
    });
  }

  wishlistScan(): Promise<JobRunView> {
    return this.runner.run("wishlist-scan", async () => {
      if (!this.flags.current().enableWishlist) {
        return { skipped: true, reason: "wishlist_disabled" };
      }
      return this.wishlist.scanAll();
    });
  }
}
