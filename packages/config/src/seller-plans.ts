/**
 * Política comercial SELLER_PLANS_V1.
 * Única fuente de tarifas de comisión TCG Market (bps enteros, CLP entero).
 * El backend (MarketplaceFeeService) es la autoridad al crear una Order.
 */

export const SELLER_PLANS_POLICY_VERSION = "SELLER_PLANS_V1" as const;

export const SELLER_PLANS = ["FREE", "SELLER_PLUS", "SELLER_PRO", "STORE"] as const;
export type SellerPlan = (typeof SELLER_PLANS)[number];

export const SELLER_SUBSCRIPTION_STATUSES = ["ACTIVE", "CANCELLED", "EXPIRED"] as const;
export type SellerSubscriptionStatus = (typeof SELLER_SUBSCRIPTION_STATUSES)[number];

export const SELLER_SUBSCRIPTION_SOURCES = ["MANUAL", "FUTURE_BILLING_PROVIDER"] as const;
export type SellerSubscriptionSource = (typeof SELLER_SUBSCRIPTION_SOURCES)[number];

export const LAUNCH_PROMO_CODE = "LAUNCH_3_PERCENT" as const;

export const SELLER_PLAN_LABELS: Record<SellerPlan, string> = {
  FREE: "Free",
  SELLER_PLUS: "Seller Plus",
  SELLER_PRO: "Seller Pro",
  STORE: "Store",
};

export type SellerPlanRates = {
  plan: SellerPlan;
  monthlyPriceClp: number;
  platformFeeBps: number;
  platformFeeCapClp: number;
};

/** Catálogo V1. No duplicar estos números en UI. */
export const SELLER_PLAN_RATES: Record<SellerPlan, SellerPlanRates> = {
  FREE: { plan: "FREE", monthlyPriceClp: 0, platformFeeBps: 600, platformFeeCapClp: 25_000 },
  SELLER_PLUS: { plan: "SELLER_PLUS", monthlyPriceClp: 7_990, platformFeeBps: 450, platformFeeCapClp: 20_000 },
  SELLER_PRO: { plan: "SELLER_PRO", monthlyPriceClp: 14_990, platformFeeBps: 350, platformFeeCapClp: 17_500 },
  STORE: { plan: "STORE", monthlyPriceClp: 24_990, platformFeeBps: 300, platformFeeCapClp: 15_000 },
};

export const LAUNCH_PROMO_FEE_BPS = 300;
export const LAUNCH_PROMO_FEE_CAP_CLP = 15_000;

export type LaunchPromoWindow = {
  enabled: boolean;
  code: typeof LAUNCH_PROMO_CODE;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function loadLaunchPromoWindow(env: NodeJS.Dict<string> = process.env): LaunchPromoWindow {
  return {
    enabled: envFlag(env.MARKETPLACE_LAUNCH_PROMO_ENABLED, false),
    code: LAUNCH_PROMO_CODE,
    startsAt: parseIsoDate(env.MARKETPLACE_LAUNCH_PROMO_START_AT),
    endsAt: parseIsoDate(env.MARKETPLACE_LAUNCH_PROMO_END_AT),
  };
}

export function isLaunchPromoActive(at: Date, window: LaunchPromoWindow = loadLaunchPromoWindow()): boolean {
  if (!window.enabled || !window.startsAt || !window.endsAt) return false;
  return at >= window.startsAt && at < window.endsAt;
}

export type MarketplaceFeeQuote = {
  policyVersion: typeof SELLER_PLANS_POLICY_VERSION;
  planCode: SellerPlan;
  promotionCode: string | null;
  monthlyPriceClp: number;
  baseFeeBps: number;
  effectiveFeeBps: number;
  baseFeeCapClp: number;
  effectiveFeeCapClp: number;
  grossAmountClp: number;
  feeBeforeCapClp: number;
  platformFeeClp: number;
  sellerPayableBeforeProcessorClp: number;
};

export function quoteMarketplaceFee(input: {
  plan: SellerPlan;
  orderSubtotalClp: number;
  at?: Date;
  promoWindow?: LaunchPromoWindow;
}): MarketplaceFeeQuote {
  const subtotal = assertPositiveIntegerClp(input.orderSubtotalClp, "orderSubtotalClp");
  const rates = SELLER_PLAN_RATES[input.plan];
  const at = input.at ?? new Date();
  const promo = isLaunchPromoActive(at, input.promoWindow ?? loadLaunchPromoWindow());
  const effectiveFeeBps = promo ? LAUNCH_PROMO_FEE_BPS : rates.platformFeeBps;
  const effectiveFeeCapClp = promo ? LAUNCH_PROMO_FEE_CAP_CLP : rates.platformFeeCapClp;
  const feeBeforeCapClp = feeBeforeCap(subtotal, effectiveFeeBps);
  const platformFeeClp = Math.min(feeBeforeCapClp, effectiveFeeCapClp);
  return {
    policyVersion: SELLER_PLANS_POLICY_VERSION,
    planCode: rates.plan,
    promotionCode: promo ? LAUNCH_PROMO_CODE : null,
    monthlyPriceClp: rates.monthlyPriceClp,
    baseFeeBps: rates.platformFeeBps,
    effectiveFeeBps,
    baseFeeCapClp: rates.platformFeeCapClp,
    effectiveFeeCapClp,
    grossAmountClp: subtotal,
    feeBeforeCapClp,
    platformFeeClp,
    sellerPayableBeforeProcessorClp: subtotal - platformFeeClp,
  };
}

/** Comisión TCG Market sobre subtotal de productos. Entero CLP, floor, luego cap. */
export function feeBeforeCap(subtotalClp: number, feeBps: number): number {
  if (subtotalClp <= 0) return 0;
  return Math.floor((subtotalClp * feeBps) / 10_000);
}

export function sellerPlanCatalog() {
  return SELLER_PLANS.map((plan) => ({
    ...SELLER_PLAN_RATES[plan],
    label: SELLER_PLAN_LABELS[plan],
  }));
}

function assertPositiveIntegerClp(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be an integer CLP amount > 0`);
  }
  return value;
}

function parseIsoDate(value: string | undefined): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}
