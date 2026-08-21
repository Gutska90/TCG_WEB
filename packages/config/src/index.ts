import { quoteShippingClp } from "./shipping";

export const ROLES = [
  "USER",
  "SELLER",
  "STORE",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

export const CARD_CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;
export type CardCondition = (typeof CARD_CONDITIONS)[number];

export const CARD_CONDITION_LABELS: Record<CardCondition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export const CARD_LANGUAGES = [
  "EN",
  "ES",
  "JA",
  "KO",
  "ZH",
  "PT",
  "FR",
  "DE",
  "IT",
] as const;
export type CardLanguage = (typeof CARD_LANGUAGES)[number];

export const CARD_FINISHES = [
  "NORMAL",
  "HOLO",
  "REVERSE_HOLO",
  "FOIL",
  "ETCHED",
  "FIRST_EDITION",
  "UNLIMITED",
  "GRADED",
  "OTHER",
] as const;
export type CardFinish = (typeof CARD_FINISHES)[number];

export { CHILE_REGIONS, findChilePlace, shippingZoneFromPlace } from "./chile";
export type { ChilePlace, ChileRegion, ShippingZone } from "./chile";
export {
  SHIPPING_RATE_SEED,
  carrierForMethod,
  carrierTrackingUrl,
  lookupShippingRate,
  quoteShippingClp,
} from "./shipping";
export type { ShippingRateSeed } from "./shipping";

export const PLATFORM = {
  currency: "CLP",
  country: "CL",
  locale: "es-CL",
  commissionBps: 800,
  orderConfirmTimeoutDays: 7,
  checkoutReservationMinutes: 30,
  shippingFlatClp: 3990,
  listingMaxImages: 8,
  listingMinImages: 1,
  listingMaxImageBytes: 10_000_000,
  priceRoundToClp: 10,
  priceSuggestFloorBps: 950,
  priceSuggestFloorMinListings: 3,
  passwordMinLength: 10,
  accessTokenTtlSec: 900,
  refreshTokenTtlDays: 30,
  searchPageSizeDefault: 20,
} as const;

export const SHIPPING_METHODS = [
  "CHILEXPRESS",
  "BLUE_EXPRESS",
  "MEETUP",
  "COORDINATED",
  "STORE_PICKUP",
] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  CHILEXPRESS: "Chilexpress",
  BLUE_EXPRESS: "Blue Express",
  MEETUP: "Encuentro presencial",
  COORDINATED: "Envío coordinado",
  STORE_PICKUP: "Retiro en tienda",
};

export const COURIER_METHODS: ReadonlySet<ShippingMethod> = new Set([
  "CHILEXPRESS",
  "BLUE_EXPRESS",
  "COORDINATED",
]);

export function shippingClpForMethod(method: ShippingMethod): number {
  return quoteShippingClp(method, "RM", "RM") ?? 0;
}

/** Comisión 8% del subtotal de productos, entero CLP, mínimo 0. */
export function commissionClp(subtotalClp: number): number {
  if (subtotalClp <= 0) return 0;
  return Math.floor((subtotalClp * PLATFORM.commissionBps) / 10_000);
}

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagada",
  PREPARING: "Preparando",
  SHIPPED: "Enviada",
  READY_FOR_MEETUP: "Lista para encuentro",
  DELIVERED: "Entregada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  DISPUTED: "En disputa",
  REFUNDED: "Reembolsada",
};

export const PAYMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "HELD",
  "RELEASED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SHIPMENT_STATUSES = [
  "PENDING",
  "LABEL_CREATED",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: "Pendiente",
  LABEL_CREATED: "Etiqueta creada",
  IN_TRANSIT: "En tránsito",
  DELIVERED: "Entregado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  ACCOUNT_CONFLICT: "ACCOUNT_CONFLICT",
  ACCOUNT_BANNED: "ACCOUNT_BANNED",
  OAUTH_NOT_CONFIGURED: "OAUTH_NOT_CONFIGURED",
  SELLER_ONBOARDING_REQUIRED: "SELLER_ONBOARDING_REQUIRED",
  LISTING_NOT_ACTIVE: "LISTING_NOT_ACTIVE",
  LISTING_INSUFFICIENT_STOCK: "LISTING_INSUFFICIENT_STOCK",
  CART_EMPTY: "CART_EMPTY",
  CHECKOUT_EXPIRED: "CHECKOUT_EXPIRED",
  ORDER_ILLEGAL_TRANSITION: "ORDER_ILLEGAL_TRANSITION",
  PAYMENT_NOT_HELD: "PAYMENT_NOT_HELD",
  REFUND_PROVIDER_ERROR: "REFUND_PROVIDER_ERROR",
  SHIPPING_METHOD_UNAVAILABLE: "SHIPPING_METHOD_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function formatClp(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatReputation(averageStars: number | null, count: number): string {
  if (count <= 0 || averageStars == null) {
    return "Sin valoraciones";
  }
  return `${averageStars.toFixed(1)} ★ (${count})`;
}

/** Redondea CLP al múltiplo de `PLATFORM.priceRoundToClp` (10). */
export function roundClp(amount: number, step = PLATFORM.priceRoundToClp): number {
  return Math.round(amount / step) * step;
}

/**
 * Precio sugerido al vender (MVP, sin historial):
 * min(market, minListing) redondeado a 10, no por debajo de minListing * 0.95 si hay ≥3 listings.
 */
export function suggestListingPrice(input: {
  market: number | null;
  minListing: number | null;
  activeListings: number;
}): number | null {
  const candidates = [input.market, input.minListing].filter(
    (value): value is number => value != null && value > 0,
  );
  if (candidates.length === 0) {
    return null;
  }
  let suggested = roundClp(Math.min(...candidates));
  if (input.minListing != null && input.activeListings >= PLATFORM.priceSuggestFloorMinListings) {
    const floor = roundClp((input.minListing * PLATFORM.priceSuggestFloorBps) / 1000);
    suggested = Math.max(suggested, floor);
  }
  return suggested < 1 ? 1 : suggested;
}
