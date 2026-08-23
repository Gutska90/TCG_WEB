import { describe, expect, it } from "vitest";
import { JOBS_LEADER_KEY, RedisSchedulerLock, type RedisCommands } from "./scheduler-lock";

class MemoryRedis implements RedisCommands {
  store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, options: { NX?: true; EX?: number }): Promise<string | null> {
    if (options.NX && this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
}

describe("RedisSchedulerLock", () => {
  it("elects one leader and renews the same instance", async () => {
    const redis = new MemoryRedis();
    const a = new RedisSchedulerLock(redis, "a", 30);
    const b = new RedisSchedulerLock(redis, "b", 30);
    expect(await a.hold()).toBe(true);
    expect(await b.hold()).toBe(false);
    expect(await a.hold()).toBe(true);
    expect(redis.store.get(JOBS_LEADER_KEY)).toBe("a");
    await a.release();
    expect(await b.hold()).toBe(true);
  });

  it("does not release another instance's lock", async () => {
    const redis = new MemoryRedis();
    const a = new RedisSchedulerLock(redis, "a", 30);
    const b = new RedisSchedulerLock(redis, "b", 30);
    expect(await a.hold()).toBe(true);
    await b.release();
    expect(await a.hold()).toBe(true);
  });
});
