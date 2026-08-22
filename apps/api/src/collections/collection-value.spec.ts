import { describe, expect, it } from "vitest";
import { createCollectionItemSchema } from "@tcg/validation";
import {
  duplicateStats,
  estimateUnitClp,
  lotEstimatedPlClp,
  lotRegisteredCostClp,
  medianInt,
  setProgressPercent,
  summarizeLots,
} from "./collection-value";

describe("collection valuation", () => {
  it("takes the median of comparable listings, then min fallback", () => {
    expect(medianInt([10_000, 20_000, 30_000])).toBe(20_000);
    expect(estimateUnitClp([12_000, 10_000, 14_000], [8_000])).toBe(12_000);
    expect(estimateUnitClp([], [9_000, 11_000])).toBe(10_000);
    expect(estimateUnitClp([], [])).toBeNull();
  });

  it("does not treat a missing market price as zero", () => {
    const summary = summarizeLots([
      { quantity: 2, purchasePriceClp: 5_000, estimatedUnitClp: 8_000 },
      { quantity: 3, purchasePriceClp: 4_000, estimatedUnitClp: null },
    ]);
    expect(summary.estimatedValueClp).toBe(16_000);
    expect(summary.itemsWithoutEstimate).toBe(3);
    expect(summary.estimatedPlClp).toBe((8_000 - 5_000) * 2);
    expect(summary.itemsInPl).toBe(2);
  });

  it("keeps registered cost only where purchase price exists", () => {
    expect(lotRegisteredCostClp(2, 10_000)).toBe(20_000);
    expect(lotRegisteredCostClp(2, null)).toBeNull();
    const summary = summarizeLots([
      { quantity: 2, purchasePriceClp: 10_000, estimatedUnitClp: 12_000 },
      { quantity: 18, purchasePriceClp: null, estimatedUnitClp: 1_000 },
    ]);
    expect(summary.registeredCostClp).toBe(20_000);
    expect(summary.itemsWithoutCost).toBe(18);
    expect(summary.estimatedValueClp).toBe(2 * 12_000 + 18 * 1_000);
  });

  it("computes P/L only when both estimate and cost exist", () => {
    expect(lotEstimatedPlClp(2, 12_000, 10_000)).toBe(4_000);
    expect(lotEstimatedPlClp(2, null, 10_000)).toBeNull();
    expect(lotEstimatedPlClp(2, 12_000, null)).toBeNull();
  });

  it("counts duplicates as extra copies, not extra progress", () => {
    expect(duplicateStats([1, 3, 1, 5])).toEqual({ duplicateCards: 2, extraCopies: 6 });
    expect(setProgressPercent(142, 207)).toBe(68.6);
    expect(setProgressPercent(0, 10)).toBe(0);
  });
});

describe("createCollectionItemSchema", () => {
  it("rejects invalid quantity", () => {
    const parsed = createCollectionItemSchema.safeParse({
      variantId: "11111111-1111-4111-8111-111111111111",
      condition: "NM",
      quantity: 0,
    });
    expect(parsed.success).toBe(false);
  });
});
