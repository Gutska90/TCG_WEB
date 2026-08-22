import { describe, expect, it } from "vitest";
import {
  dropSaleOutliers,
  medianInt,
  saleConfidence,
  tcgMarketPrice,
  utcDateOnly,
} from "./price-index";

describe("price index", () => {
  it("takes a median and drops outliers", () => {
    expect(medianInt([10_000, 20_000, 30_000])).toBe(20_000);
    expect(dropSaleOutliers([10_000, 11_000, 12_000, 100_000])).toEqual([10_000, 11_000, 12_000]);
  });

  it("prefers sales over listing average when volume exists", () => {
    expect(tcgMarketPrice({ salePrices30d: [20_000, 22_000, 24_000], listingAvgClp: 40_000 })).toBe(22_000);
    expect(tcgMarketPrice({ salePrices30d: [], listingAvgClp: 15_000 })).toBe(15_000);
    expect(tcgMarketPrice({ salePrices30d: [], listingAvgClp: null })).toBeNull();
  });

  it("maps sale count to confidence", () => {
    expect(saleConfidence(0)).toBeNull();
    expect(saleConfidence(1)).toBe("LOW");
    expect(saleConfidence(3)).toBe("MEDIUM");
    expect(saleConfidence(10)).toBe("HIGH");
  });

  it("normalizes capturedOn to UTC date", () => {
    const d = utcDateOnly(new Date("2026-08-21T23:15:00.000Z"));
    expect(d.toISOString().slice(0, 10)).toBe("2026-08-21");
  });
});
