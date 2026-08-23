import { describe, expect, it } from "vitest";
import { connectRedis } from "./redis.factory";

describe("connectRedis", () => {
  it("does not connect in test", async () => {
    await expect(
      connectRedis({ NODE_ENV: "test", REDIS_URL: "redis://localhost:6379" }),
    ).resolves.toBeNull();
  });

  it("skips without REDIS_URL", async () => {
    await expect(connectRedis({ NODE_ENV: "development" })).resolves.toBeNull();
  });
});
