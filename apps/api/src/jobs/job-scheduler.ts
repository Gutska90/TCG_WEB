import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";
import { PLATFORM } from "@tcg/config";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { JobRunner } from "./job-runner";
import { JobsService } from "./jobs.service";
import { AlwaysLeaderLock, SCHEDULER_LOCK, type SchedulerLock } from "./scheduler-lock";

@Injectable()
export class JobScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobScheduler.name);
  private readonly lock: SchedulerLock;
  private leaderTimer: NodeJS.Timeout | null = null;
  private workTimers: NodeJS.Timeout[] = [];
  private stopped = false;
  private workStarted = false;

  constructor(
    private readonly flags: FeatureFlagsService,
    private readonly jobs: JobsService,
    private readonly runner: JobRunner,
    @Optional() @Inject(SCHEDULER_LOCK) lock?: SchedulerLock,
  ) {
    this.lock = lock ?? new AlwaysLeaderLock();
  }

  onModuleInit(): void {
    if (!this.flags.current().jobsEnabled) return;
    this.leaderTimer = setInterval(() => void this.ensureLeader(), 15_000);
    void this.ensureLeader();
    this.logger.log("Scheduler started");
  }

  async onModuleDestroy(): Promise<void> {
    this.stop();
    await this.lock.release();
    await this.runner.failStale(0);
  }

  stop(): void {
    this.stopped = true;
    if (this.leaderTimer) {
      clearInterval(this.leaderTimer);
      this.leaderTimer = null;
    }
    this.stopWork();
  }

  isScheduling(): boolean {
    return this.workStarted;
  }

  staleWindowMs(): number {
    return PLATFORM.jobStaleMinutes * 60_000;
  }

  private async ensureLeader(): Promise<void> {
    if (this.stopped) return;
    try {
      const leader = await this.lock.hold();
      if (leader) this.startWork();
      else this.stopWork();
    } catch (error) {
      this.logger.error(`leader lock failed: ${error instanceof Error ? error.message : "unknown"}`);
      this.stopWork();
    }
  }

  private startWork(): void {
    if (this.workStarted || this.stopped) return;
    this.workStarted = true;
    this.workTimers.push(setInterval(() => void this.safe("expire-checkouts", () => this.jobs.expireCheckouts()), 60_000));
    this.workTimers.push(setInterval(() => void this.safe("housekeeping", () => this.jobs.housekeeping()), 5 * 60_000));
    this.workTimers.push(setInterval(() => void this.safe("reconciliation", () => this.jobs.reconciliation()), 60 * 60_000));
    this.workTimers.push(setInterval(() => void this.safe("refund-retry", () => this.jobs.refundRetry()), 10 * 60_000));
    this.workTimers.push(setInterval(() => void this.safe("card-prices", () => this.jobs.cardPrices()), 6 * 60 * 60_000));
    this.workTimers.push(
      setInterval(() => void this.safe("collection-value", () => this.jobs.collectionValue()), 24 * 60 * 60_000),
    );
    this.workTimers.push(setInterval(() => void this.safe("wishlist-scan", () => this.jobs.wishlistScan()), 5 * 60_000));
    this.logger.log("Job intervals armed (leader)");
  }

  private stopWork(): void {
    for (const timer of this.workTimers) clearInterval(timer);
    this.workTimers = [];
    this.workStarted = false;
  }

  private async safe(name: string, fn: () => Promise<unknown>): Promise<void> {
    if (this.stopped) return;
    try {
      await fn();
    } catch (error) {
      this.logger.error(`${name} failed: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
}
