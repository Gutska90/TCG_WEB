export type SchedulerLock = {
  /** True if this process should run in-process job intervals. */
  hold(): Promise<boolean>;
  release(): Promise<void>;
};

export class AlwaysLeaderLock implements SchedulerLock {
  async hold(): Promise<boolean> {
    return true;
  }

  async release(): Promise<void> {
    /* no-op */
  }
}

export type RedisCommands = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { NX?: true; EX?: number }): Promise<string | null>;
  del(key: string): Promise<number>;
};

export const JOBS_LEADER_KEY = "tcg:jobs:leader";

export class RedisSchedulerLock implements SchedulerLock {
  constructor(
    private readonly redis: RedisCommands,
    private readonly instanceId: string,
    private readonly ttlSec = 60,
  ) {}

  async hold(): Promise<boolean> {
    const current = await this.redis.get(JOBS_LEADER_KEY);
    if (current === this.instanceId) {
      await this.redis.set(JOBS_LEADER_KEY, this.instanceId, { EX: this.ttlSec });
      return true;
    }
    if (current == null) {
      const ok = await this.redis.set(JOBS_LEADER_KEY, this.instanceId, { NX: true, EX: this.ttlSec });
      return ok === "OK";
    }
    return false;
  }

  async release(): Promise<void> {
    const current = await this.redis.get(JOBS_LEADER_KEY);
    if (current === this.instanceId) {
      await this.redis.del(JOBS_LEADER_KEY);
    }
  }
}

export const SCHEDULER_LOCK = Symbol("SCHEDULER_LOCK");
export const REDIS_CLIENT = Symbol("REDIS_CLIENT");
