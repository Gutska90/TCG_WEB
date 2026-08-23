import { describe, expect, it } from "vitest";
import { mapPool } from "./async-pool";

describe("mapPool", () => {
  it("preserves order with a concurrency cap", async () => {
    const seen: number[] = [];
    const out = await mapPool([1, 2, 3, 4], 2, async (n) => {
      seen.push(n);
      await Promise.resolve();
      return n * 10;
    });
    expect(out).toEqual([10, 20, 30, 40]);
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });
});
