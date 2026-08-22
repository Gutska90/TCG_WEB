import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PLATFORM } from "@tcg/config";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { JobRunner } from "./job-runner";
import { JobsService } from "./jobs.service";

@Injectable()
export class JobScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobScheduler.name);
  private timers: NodeJS.Timeout[] = [];
  private stopped = false;

  constructor(
    private readonly flags: FeatureFlagsService,
    private readonly jobs: JobsService,
    private readonly runner: JobRunner,
  ) {}

  onModuleInit(): void {
    if (!this.flags.current().jobsEnabled) return;
    this.timers.push(setInterval(() => void this.safe("expire-checkouts", () => this.jobs.expireCheckouts()), 60_000));
    this.timers.push(setInterval(() => void this.safe("housekeeping", () => this.jobs.housekeeping()), 5 * 60_000));
    this.timers.push(setInterval(() => void this.safe("reconciliation", () => this.jobs.reconciliation()), 60 * 60_000));
    this.timers.push(setInterval(() => void this.safe("refund-retry", () => this.jobs.refundRetry()), 10 * 60_000));
    this.timers.push(setInterval(() => void this.safe("card-prices", () => this.jobs.cardPrices()), 6 * 60 * 60_000));
    this.timers.push(setInterval(() => void this.safe("collection-value", () => this.jobs.collectionValue()), 24 * 60 * 60_000));
    this.timers.push(setInterval(() => void this.safe("wishlist-scan", () => this.jobs.wishlistScan()), 5 * 60_000));
    this.logger.log("Scheduler started");
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
    await this.runner.failStale(0);
  }

  stop(): void {
    this.stopped = true;
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
  }

  private async safe(name: string, fn: () => Promise<unknown>): Promise<void> {
    if (this.stopped) return;
    try {
      await fn();
    } catch (error) {
      this.logger.error(`${name} failed: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  staleWindowMs(): number {
    return PLATFORM.jobStaleMinutes * 60_000;
  }
}
