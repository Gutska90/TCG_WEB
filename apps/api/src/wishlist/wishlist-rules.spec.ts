import { describe, expect, it } from "vitest";
import { shouldNotifyPriceDrop, shouldNotifyWishlistHit } from "./wishlist-rules";

describe("wishlist rules", () => {
  it("notifies a new listing at or below target", () => {
    expect(
      shouldNotifyWishlistHit({
        minPriceClp: 14_990,
        targetPriceClp: 15_000,
        listingId: "a",
        lastListingId: null,
        lastPriceClp: null,
      }),
    ).toBe(true);
  });

  it("does not spam the same listing at the same price", () => {
    expect(
      shouldNotifyWishlistHit({
        minPriceClp: 14_990,
        targetPriceClp: 15_000,
        listingId: "a",
        lastListingId: "a",
        lastPriceClp: 14_990,
      }),
    ).toBe(false);
  });

  it("notifies again if the same listing drops further", () => {
    expect(
      shouldNotifyWishlistHit({
        minPriceClp: 12_000,
        targetPriceClp: 15_000,
        listingId: "a",
        lastListingId: "a",
        lastPriceClp: 14_990,
      }),
    ).toBe(true);
  });

  it("requires a 10% drop vs 7d min for PRICE_DROP", () => {
    expect(shouldNotifyPriceDrop({ currentMin: 9_000, min7d: 10_000, thresholdBps: 1000 })).toBe(true);
    expect(shouldNotifyPriceDrop({ currentMin: 9_500, min7d: 10_000, thresholdBps: 1000 })).toBe(false);
    expect(shouldNotifyPriceDrop({ currentMin: 9_000, min7d: null, thresholdBps: 1000 })).toBe(false);
  });
});
