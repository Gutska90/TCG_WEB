import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsProps } from "./analytics-sanitize";

describe("sanitizeAnalyticsProps", () => {
  it("drops tokens and emails", () => {
    const safe = sanitizeAnalyticsProps({
      token: "abc",
      email: "a@b.c",
      qLength: 3,
    });
    expect(safe).toEqual({ qLength: 3 });
  });

  it("drops purchasePrice", () => {
    const safe = sanitizeAnalyticsProps({
      purchasePrice: 1000,
      purchasePriceClp: 1000,
      quantity: 2,
    });
    expect(safe).toEqual({ quantity: 2 });
  });
});
