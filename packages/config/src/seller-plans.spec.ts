import { describe, expect, it } from "vitest";
import {
  LAUNCH_PROMO_CODE,
  LAUNCH_PROMO_FEE_BPS,
  LAUNCH_PROMO_FEE_CAP_CLP,
  LAUNCH_PROMO_INACTIVE,
  SELLER_PLAN_RATES,
  isLaunchPromoActive,
  orderFeeSnapshotFromQuote,
  quoteMarketplaceFee,
  sellerPlanLabel,
  type LaunchPromoWindow,
} from "./seller-plans";

const PROMO_OFF = LAUNCH_PROMO_INACTIVE;

const PROMO_ON: LaunchPromoWindow = {
  enabled: true,
  code: LAUNCH_PROMO_CODE,
  startsAt: new Date("2026-01-01T00:00:00.000Z"),
  endsAt: new Date("2026-03-02T00:00:00.000Z"),
};

describe("SELLER_PLANS_V1 quotes", () => {
  it("FREE 30k → 1800", () => {
    expect(quoteMarketplaceFee({ plan: "FREE", orderSubtotalClp: 30_000, promoWindow: PROMO_OFF }).platformFeeClp).toBe(
      1_800,
    );
  });

  it("PLUS 30k → 1350", () => {
    expect(
      quoteMarketplaceFee({ plan: "SELLER_PLUS", orderSubtotalClp: 30_000, promoWindow: PROMO_OFF }).platformFeeClp,
    ).toBe(1_350);
  });

  it("PRO 30k → 1050", () => {
    expect(
      quoteMarketplaceFee({ plan: "SELLER_PRO", orderSubtotalClp: 30_000, promoWindow: PROMO_OFF }).platformFeeClp,
    ).toBe(1_050);
  });

  it("STORE 30k → 900", () => {
    expect(quoteMarketplaceFee({ plan: "STORE", orderSubtotalClp: 30_000, promoWindow: PROMO_OFF }).platformFeeClp).toBe(
      900,
    );
  });

  it("applies caps on 1M orders", () => {
    expect(quoteMarketplaceFee({ plan: "FREE", orderSubtotalClp: 1_000_000, promoWindow: PROMO_OFF }).platformFeeClp).toBe(
      25_000,
    );
    expect(
      quoteMarketplaceFee({ plan: "SELLER_PLUS", orderSubtotalClp: 1_000_000, promoWindow: PROMO_OFF }).platformFeeClp,
    ).toBe(20_000);
    expect(
      quoteMarketplaceFee({ plan: "SELLER_PRO", orderSubtotalClp: 1_000_000, promoWindow: PROMO_OFF }).platformFeeClp,
    ).toBe(17_500);
    expect(quoteMarketplaceFee({ plan: "STORE", orderSubtotalClp: 1_000_000, promoWindow: PROMO_OFF }).platformFeeClp).toBe(
      15_000,
    );
  });

  it("launch promo applies 3% / cap 15000 to every plan", () => {
    const at = new Date("2026-02-01T00:00:00.000Z");
    for (const plan of ["FREE", "SELLER_PLUS", "SELLER_PRO", "STORE"] as const) {
      const quote = quoteMarketplaceFee({ plan, orderSubtotalClp: 30_000, at, promoWindow: PROMO_ON });
      expect(quote.effectiveFeeBps).toBe(LAUNCH_PROMO_FEE_BPS);
      expect(quote.effectiveFeeCapClp).toBe(LAUNCH_PROMO_FEE_CAP_CLP);
      expect(quote.platformFeeClp).toBe(900);
      expect(quote.promotionCode).toBe(LAUNCH_PROMO_CODE);
      expect(quote.planCode).toBe(plan);
    }
    expect(
      quoteMarketplaceFee({ plan: "FREE", orderSubtotalClp: 1_000_000, at, promoWindow: PROMO_ON }).platformFeeClp,
    ).toBe(15_000);
  });

  it("expired promo uses the plan's normal rate", () => {
    const quote = quoteMarketplaceFee({
      plan: "FREE",
      orderSubtotalClp: 30_000,
      at: new Date("2026-04-01T00:00:00.000Z"),
      promoWindow: PROMO_ON,
    });
    expect(quote.promotionCode).toBeNull();
    expect(quote.platformFeeClp).toBe(1_800);
    expect(quote.effectiveFeeBps).toBe(SELLER_PLAN_RATES.FREE.platformFeeBps);
  });

  it("historical quote is independent of a later plan", () => {
    const historical = quoteMarketplaceFee({
      plan: "FREE",
      orderSubtotalClp: 30_000,
      at: new Date("2026-02-01T00:00:00.000Z"),
      promoWindow: PROMO_ON,
    });
    const later = quoteMarketplaceFee({
      plan: "STORE",
      orderSubtotalClp: 30_000,
      at: new Date("2026-04-01T00:00:00.000Z"),
      promoWindow: PROMO_ON,
    });
    expect(historical.platformFeeClp).toBe(900);
    expect(later.platformFeeClp).toBe(900);
    expect(historical.planCode).toBe("FREE");
    expect(later.planCode).toBe("STORE");
  });

  it("promo window without dates is inactive", () => {
    expect(isLaunchPromoActive(new Date(), { ...PROMO_ON, startsAt: null })).toBe(false);
  });

  it("uses integer math only", () => {
    const quote = quoteMarketplaceFee({ plan: "FREE", orderSubtotalClp: 1, promoWindow: PROMO_OFF });
    expect(Number.isInteger(quote.platformFeeClp)).toBe(true);
    expect(quote.platformFeeClp).toBe(0);
  });

  it("sellerPlanLabel maps codes and falls back", () => {
    expect(sellerPlanLabel("FREE")).toBe("Free");
    expect(sellerPlanLabel("SELLER_PLUS")).toBe("Seller Plus");
    expect(sellerPlanLabel("unknown")).toBe("unknown");
  });

  it("orderFeeSnapshotFromQuote copies quote into Order columns", () => {
    const quote = quoteMarketplaceFee({ plan: "FREE", orderSubtotalClp: 30_000, promoWindow: PROMO_OFF });
    expect(orderFeeSnapshotFromQuote(quote)).toEqual({
      commissionClp: 1_800,
      marketplaceFeePolicyVersion: quote.policyVersion,
      sellerPlanCode: "FREE",
      marketplacePromotionCode: null,
      marketplaceFeeBps: 600,
      marketplaceFeeCapClp: 25_000,
    });
  });
});
