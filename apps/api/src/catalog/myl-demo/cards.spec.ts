import { describe, expect, it } from "vitest";
import { MYL_DEMO_CARDS, MYL_DEMO_SETS } from "./cards";
import { toMylDemoAttributes } from "./import-myl";

describe("MyL demo pack", () => {
  it("has 100+ unique named cards and no synthetic showcase provenance", () => {
    const keys = MYL_DEMO_CARDS.map((row) => `${row.set.code}:${row.name}`);
    expect(new Set(keys).size).toBe(MYL_DEMO_CARDS.length);
    expect(MYL_DEMO_CARDS.length).toBeGreaterThanOrEqual(100);
    expect(Object.keys(MYL_DEMO_SETS).length).toBeGreaterThanOrEqual(6);
    const sample = toMylDemoAttributes(MYL_DEMO_CARDS[0]!);
    expect(sample.sourceQuality).toBe("CURATED_VERIFIED");
    expect(sample.source).toBe("myl-demo-pack");
    expect(sample.verified).toBe(false);
  });
});
