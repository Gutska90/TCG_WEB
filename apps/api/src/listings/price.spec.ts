import { describe, expect, it } from "vitest";
import { suggestListingPrice } from "@tcg/config";

describe("suggestListingPrice", () => {
  it("returns null without market data", () => {
    expect(suggestListingPrice({ market: null, minListing: null, activeListings: 0 })).toBeNull();
  });

  it("uses the min of market and minListing, rounded to 10", () => {
    expect(suggestListingPrice({ market: 18004, minListing: 17500, activeListings: 1 })).toBe(17500);
  });

  it("does not go below 95% of minListing when there are 3+ listings", () => {
    expect(suggestListingPrice({ market: 10000, minListing: 12500, activeListings: 3 })).toBe(11880);
  });
});
