import { quoteShippingClp } from "./shipping";
import { LAUNCH_PROMO_INACTIVE, quoteMarketplaceFee } from "./seller-plans";

export {
  COMPRA_PROTEGIDA_DEFINITION,
  FORBIDDEN_PAYMENT_USER_PHRASES,
  HELP_FAQS,
  LEGAL,
  LEGAL_CONSENT_CHECKBOX,
  LEGAL_DOCUMENTS,
  MARKETING_CONSENT_CHECKBOX,
  MARKETPLACE_DOCUMENT,
  PAYMENT_COPY,
  PRIVACY_DOCUMENT,
  PUBLIC_LEGAL_LINKS,
  REFUNDS_DOCUMENT,
  REQUIRED_TERMS_HEADINGS,
  TERMS_DOCUMENT,
  containsForbiddenPaymentCopy,
  legalAcceptanceIsCurrent,
} from "./legal";
export type { LegalDocument, LegalSection } from "./legal";
export {
  LAUNCH_PROMO_CODE,
  LAUNCH_PROMO_FEE_BPS,
  LAUNCH_PROMO_FEE_CAP_CLP,
  LAUNCH_PROMO_INACTIVE,
  SELLER_PLANS,
  SELLER_PLANS_POLICY_VERSION,
  SELLER_PLAN_LABELS,
  SELLER_PLAN_RATES,
  orderFeeSnapshotFromQuote,
  sellerPlanLabel,
  SELLER_SUBSCRIPTION_SOURCES,
  SELLER_SUBSCRIPTION_STATUSES,
  feeBeforeCap,
  formatFeePercentEsCl,
  isLaunchPromoActive,
  loadLaunchPromoWindow,
  publicSellerPlansConfig,
  quoteMarketplaceFee,
  sellerPlanCatalog,
} from "./seller-plans";
export type {
  LaunchPromoWindow,
  MarketplaceFeeQuote,
  SellerPlan,
  SellerPlanRates,
  SellerSubscriptionSource,
  SellerSubscriptionStatus,
} from "./seller-plans";

export const ROLES = [
  "USER",
  "SELLER",
  "STORE",
  "MODERATOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

/** Fase 10A: métricas financieras y listados operativos. MODERATOR no entra. */
export const ADMIN_OPS_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
export type AdminOpsRole = (typeof ADMIN_OPS_ROLES)[number];

/** Fase 10.5: disputas, reportes, pause listing. Sin acceso financiero. */
export const MODERATION_ROLES = ["MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
export type ModerationRole = (typeof MODERATION_ROLES)[number];

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

export const CATALOG_SUBMISSION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "DUPLICATE",
  "NEEDS_INFO",
] as const;
export type CatalogSubmissionStatus = (typeof CATALOG_SUBMISSION_STATUSES)[number];

export const CATALOG_SUBMISSION_STATUS_LABELS: Record<CatalogSubmissionStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  DUPLICATE: "Duplicada",
  NEEDS_INFO: "Necesita información",
};

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
export { listingWhatsappMessage, normalizeWhatsappE164, whatsappMeHref } from "./whatsapp";
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
  /** @deprecated M1: no usar para Orders. Ver SELLER_PLAN_RATES + MarketplaceFeeService. */
  commissionBps: 600,
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
  reconDefaultWindowHours: 48,
  reconStaleRunMinutes: 15,
  disputeMaxEvidence: 8,
  disputeMaxMessageChars: 4000,
  disputeEvidenceMaxBytes: 10_000_000,
  reportMaxPerWindow: 5,
  reportWindowMinutes: 10,
  jobStaleMinutes: 20,
  refundRetryMaxAttempts: 5,
  refundRetryBackoffMinutes: 15,
  jsonBodyLimitBytes: 262_144,
  feedbackMaxPerWindow: 5,
  feedbackWindowMinutes: 10,
  feedbackMaxMessageChars: 4000,
  collectionNotesMaxChars: 500,
  collectionBulkMaxIds: 50,
  priceConfidenceHighSales: 10,
  priceConfidenceMediumSales: 3,
  priceDropMinBps: 1000,
} as const;

export const FEEDBACK_CATEGORIES = [
  "ACCOUNT",
  "BUY",
  "SELL",
  "DISPUTE",
  "REFUND",
  "ABUSE",
  "OTHER",
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  ACCOUNT: "Cuenta",
  BUY: "Compra",
  SELL: "Venta",
  DISPUTE: "Disputa",
  REFUND: "Reembolso",
  ABUSE: "Reportar abuso",
  OTHER: "Otro",
};

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

/**
 * Helper de catálogo FREE sin promo (seeds/legacy).
 * Las Orders nuevas deben usar MarketplaceFeeService — no este helper.
 */
export function commissionClp(subtotalClp: number): number {
  if (subtotalClp <= 0) return 0;
  return quoteMarketplaceFee({
    plan: "FREE",
    orderSubtotalClp: subtotalClp,
    promoWindow: LAUNCH_PROMO_INACTIVE,
  }).platformFeeClp;
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

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado (procesador)",
  REJECTED: "Rechazado",
  HELD: "Recibido por la plataforma (interno)",
  RELEASED: "Elegible para liquidación (interno)",
  REFUNDED: "Reembolsado",
};

/** Copy para usuario final. No usa códigos HELD/RELEASED. */
export const PAYMENT_STATUS_USER_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendiente de pago",
  APPROVED: "Procesando el cobro",
  REJECTED: "No se pudo cobrar",
  HELD: "Pago recibido por la plataforma; aún no elegible para liquidación al vendedor.",
  RELEASED: "Orden elegible para liquidación al vendedor.",
  REFUNDED: "Reembolsado",
};

export const PAYOUT_STATUS_USER_LABELS: Record<
  "PENDING" | "APPROVED" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED",
  string
> = {
  PENDING: "Liquidación registrada al vendedor.",
  APPROVED: "Liquidación registrada al vendedor.",
  PROCESSING: "Liquidación en curso.",
  PAID: "Liquidación pagada al vendedor.",
  FAILED: "La liquidación no se completó.",
  CANCELLED: "Liquidación cancelada.",
};

export const REFUND_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const PAYOUT_STATUSES = [
  "PENDING",
  "APPROVED",
  "PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  PROCESSING: "En proceso",
  PAID: "Pagado",
  FAILED: "Fallido",
  CANCELLED: "Cancelado",
};

export const PAYOUT_METHODS = ["MANUAL"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const LEDGER_ENTRY_TYPES = [
  "PAYMENT_CAPTURED",
  "SELLER_PAYABLE",
  "PLATFORM_FEE",
  "REFUND",
  "PAYOUT_RESERVED",
  "PAYOUT_PAID",
  "PAYOUT_REVERSED",
  "ADJUSTMENT",
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const LEDGER_ENTRY_TYPE_LABELS: Record<LedgerEntryType, string> = {
  PAYMENT_CAPTURED: "Cobro capturado",
  SELLER_PAYABLE: "Obligación seller",
  PLATFORM_FEE: "Comisión plataforma",
  REFUND: "Reembolso",
  PAYOUT_RESERVED: "Payout reservado",
  PAYOUT_PAID: "Payout pagado",
  PAYOUT_REVERSED: "Payout revertido",
  ADJUSTMENT: "Ajuste",
};

export const RECONCILIATION_RUN_STATUSES = ["RUNNING", "COMPLETED", "FAILED"] as const;
export type ReconciliationRunStatus = (typeof RECONCILIATION_RUN_STATUSES)[number];

export const RECONCILIATION_ISSUE_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED", "IGNORED"] as const;
export type ReconciliationIssueStatus = (typeof RECONCILIATION_ISSUE_STATUSES)[number];

export const RECONCILIATION_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;
export type ReconciliationSeverity = (typeof RECONCILIATION_SEVERITIES)[number];

export const RECONCILIATION_ISSUE_TYPES = [
  "PAYMENT_MISSING_LOCAL",
  "PAYMENT_MISSING_PROVIDER",
  "PAYMENT_STATUS_MISMATCH",
  "PAYMENT_AMOUNT_MISMATCH",
  "REFUND_MISSING_LOCAL",
  "REFUND_MISSING_PROVIDER",
  "REFUND_STATUS_MISMATCH",
  "REFUND_AMOUNT_MISMATCH",
  "UNKNOWN_PROVIDER_PAYMENT",
  "DUPLICATE_PROVIDER_PAYMENT",
  "LEDGER_MISSING_PAYMENT_CAPTURED",
  "LEDGER_MISSING_SELLER_PAYABLE",
  "LEDGER_MISSING_REFUND",
  "PAYOUT_LEDGER_MISMATCH",
  "PLATFORM_FEE_SNAPSHOT_MISMATCH",
] as const;
export type ReconciliationIssueType = (typeof RECONCILIATION_ISSUE_TYPES)[number];

export const RECONCILIATION_ISSUE_TYPE_LABELS: Record<ReconciliationIssueType, string> = {
  PAYMENT_MISSING_LOCAL: "Pago ausente en Postgres",
  PAYMENT_MISSING_PROVIDER: "Pago ausente en el proveedor",
  PAYMENT_STATUS_MISMATCH: "Estado de pago distinto",
  PAYMENT_AMOUNT_MISMATCH: "Monto de pago distinto",
  REFUND_MISSING_LOCAL: "Refund ausente en Postgres",
  REFUND_MISSING_PROVIDER: "Refund ausente en el proveedor",
  REFUND_STATUS_MISMATCH: "Estado de refund distinto",
  REFUND_AMOUNT_MISMATCH: "Monto de refund distinto",
  UNKNOWN_PROVIDER_PAYMENT: "Pago proveedor desconocido",
  DUPLICATE_PROVIDER_PAYMENT: "Pago proveedor duplicado",
  LEDGER_MISSING_PAYMENT_CAPTURED: "Falta PAYMENT_CAPTURED",
  LEDGER_MISSING_SELLER_PAYABLE: "Falta SELLER_PAYABLE",
  LEDGER_MISSING_REFUND: "Falta asiento REFUND",
  PAYOUT_LEDGER_MISMATCH: "Payout PAID sin PAYOUT_PAID",
  PLATFORM_FEE_SNAPSHOT_MISMATCH: "PLATFORM_FEE no coincide con el snapshot de la Order",
};

export const RECONCILIATION_SEVERITY_LABELS: Record<ReconciliationSeverity, string> = {
  INFO: "Info",
  WARNING: "Advertencia",
  CRITICAL: "Crítico",
};

export const RECONCILIATION_ISSUE_STATUS_LABELS: Record<ReconciliationIssueStatus, string> = {
  OPEN: "Abierto",
  ACKNOWLEDGED: "Reconocido",
  RESOLVED: "Resuelto",
  IGNORED: "Ignorado",
};

export const DISPUTE_REASONS = [
  "ITEM_NOT_RECEIVED",
  "WRONG_ITEM",
  "WRONG_CONDITION",
  "DAMAGED",
  "COUNTERFEIT_SUSPECTED",
  "SELLER_UNRESPONSIVE",
  "OTHER",
] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  ITEM_NOT_RECEIVED: "No llegó",
  WRONG_ITEM: "Ítem incorrecto",
  WRONG_CONDITION: "Condición distinta",
  DAMAGED: "Dañado",
  COUNTERFEIT_SUSPECTED: "Posible falso",
  SELLER_UNRESPONSIVE: "Vendedor no responde",
  OTHER: "Otro",
};

export const DISPUTE_STATUSES = [
  "OPEN",
  "WAITING_BUYER",
  "WAITING_SELLER",
  "UNDER_REVIEW",
  "RESOLVED_BUYER",
  "RESOLVED_SELLER",
  "CANCELLED",
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "Abierta",
  WAITING_BUYER: "Espera comprador",
  WAITING_SELLER: "Espera vendedor",
  UNDER_REVIEW: "En revisión",
  RESOLVED_BUYER: "Resuelta a favor del comprador",
  RESOLVED_SELLER: "Resuelta a favor del vendedor",
  CANCELLED: "Cancelada",
};

export const DISPUTE_EVIDENCE_TYPES = ["PHOTO", "VIDEO", "DOCUMENT", "OTHER"] as const;
export type DisputeEvidenceType = (typeof DISPUTE_EVIDENCE_TYPES)[number];

export const REPORT_TARGET_TYPES = ["USER", "LISTING", "IMAGE"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  "COUNTERFEIT",
  "STOLEN_IMAGE",
  "SPAM",
  "MISLEADING_DESCRIPTION",
  "SCAM_SUSPECTED",
  "ABUSIVE_CONTENT",
  "OTHER",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  COUNTERFEIT: "Falsificación",
  STOLEN_IMAGE: "Foto ajena",
  SPAM: "Spam",
  MISLEADING_DESCRIPTION: "Descripción engañosa",
  SCAM_SUSPECTED: "Posible estafa",
  ABUSIVE_CONTENT: "Contenido abusivo",
  OTHER: "Otro",
};

export const REPORT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: "Abierto",
  IN_REVIEW: "En revisión",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado",
};

export const MODERATION_ACTION_TYPES = [
  "LISTING_PAUSED",
  "LISTING_RESTORED",
  "USER_WARNED",
  "SELLER_SUSPENDED",
  "SELLER_RESTORED",
  "REPORT_RESOLVED",
  "DISPUTE_ASSIGNED",
  "DISPUTE_RESOLVED",
] as const;
export type ModerationActionType = (typeof MODERATION_ACTION_TYPES)[number];

export const LISTING_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ListingImageMime = (typeof LISTING_IMAGE_MIMES)[number];

export const AVATAR_MIMES = LISTING_IMAGE_MIMES;
export type AvatarMime = ListingImageMime;

export const DISPUTE_EVIDENCE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
] as const;

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: "Pendiente",
  COMPLETED: "Completado",
  FAILED: "Fallido",
};

export const LISTING_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "SOLD", "CANCELLED"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  CANCELLED: "Cancelada",
};

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
  PAYOUT_ILLEGAL_TRANSITION: "PAYOUT_ILLEGAL_TRANSITION",
  PAYOUT_UNAVAILABLE: "PAYOUT_UNAVAILABLE",
  PAYOUT_PROVIDER_REF_REQUIRED: "PAYOUT_PROVIDER_REF_REQUIRED",
  INSUFFICIENT_SELLER_BALANCE: "INSUFFICIENT_SELLER_BALANCE",
  RECONCILIATION_IN_PROGRESS: "RECONCILIATION_IN_PROGRESS",
  DISPUTE_ALREADY_OPEN: "DISPUTE_ALREADY_OPEN",
  DISPUTE_ILLEGAL_TRANSITION: "DISPUTE_ILLEGAL_TRANSITION",
  REPORT_DUPLICATE: "REPORT_DUPLICATE",
  SELLER_SUSPENDED: "SELLER_SUSPENDED",
  EVIDENCE_LIMIT: "EVIDENCE_LIMIT",
  FILE_NOT_ALLOWED: "FILE_NOT_ALLOWED",
  FILE_NOT_READY: "FILE_NOT_READY",
  FILE_NOT_STORED: "FILE_NOT_STORED",
  CATALOG_SUBMISSION_NOT_REVIEWABLE: "CATALOG_SUBMISSION_NOT_REVIEWABLE",
  CATALOG_SUBMISSION_NOT_RESUBMITTABLE: "CATALOG_SUBMISSION_NOT_RESUBMITTABLE",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  SERVICE_TEMPORARILY_DISABLED: "SERVICE_TEMPORARILY_DISABLED",
  PAYOUT_DISPUTED: "PAYOUT_DISPUTED",
  LEGAL_CONSENT_REQUIRED: "LEGAL_CONSENT_REQUIRED",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  LAST_AUTH_METHOD: "LAST_AUTH_METHOD",
  PASSWORD_ALREADY_SET: "PASSWORD_ALREADY_SET",
  INVALID_FILTER: "INVALID_FILTER",
  FILTER_NOT_SUPPORTED_FOR_GAME: "FILTER_NOT_SUPPORTED_FOR_GAME",
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

export const CARD_PRICE_SOURCES = ["LISTING_MIN", "LISTING_AVG", "SALE", "IMPORT"] as const;
export type CardPriceSource = (typeof CARD_PRICE_SOURCES)[number];

export const PRICE_RANGES = ["1m", "3m", "6m", "1a"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

export const PRICE_RANGE_DAYS: Record<PriceRange, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1a": 365,
};

export const PRICE_CONFIDENCE = ["HIGH", "MEDIUM", "LOW"] as const;
export type PriceConfidence = (typeof PRICE_CONFIDENCE)[number];

export const PRICE_CONFIDENCE_LABELS: Record<PriceConfidence, string> = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
};

export const NOTIFICATION_TYPES = [
  "SALE_MADE",
  "PURCHASE_MADE",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "ORDER_CONFIRMED",
  "ORDER_CANCELLED",
  "ORDER_DISPUTED",
  "RATING_RECEIVED",
  "WISHLIST_HIT",
  "PRICE_DROP",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  SALE_MADE: "Venta",
  PURCHASE_MADE: "Compra",
  ORDER_SHIPPED: "Pedido despachado",
  ORDER_DELIVERED: "Pedido entregado",
  ORDER_CONFIRMED: "Recepción confirmada",
  ORDER_CANCELLED: "Pedido cancelado",
  ORDER_DISPUTED: "Reclamo",
  RATING_RECEIVED: "Valoración",
  WISHLIST_HIT: "Aviso de wishlist",
  PRICE_DROP: "Bajada de precio",
};

export const JOB_RUN_STATUSES = ["RUNNING", "COMPLETED", "FAILED", "SKIPPED"] as const;
export type JobRunStatus = (typeof JOB_RUN_STATUSES)[number];

export const JOB_RUN_STATUS_LABELS: Record<JobRunStatus, string> = {
  RUNNING: "En curso",
  COMPLETED: "Completado",
  FAILED: "Fallido",
  SKIPPED: "Omitido",
};

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

/**
 * Defensa adicional al production gate de ADR 0008.
 * No sustituye revisión legal. Nunca dejar REAL_PAYMENTS_LEGAL_APPROVED=true en el repo.
 */
export function assertRealPaymentsLegalGate(env: NodeJS.Dict<string> = process.env): void {
  if ((env.NODE_ENV ?? "") !== "production") return;
  if (!envFlag(env.ENABLE_REAL_PAYMENTS, false)) return;
  if (!envFlag(env.REAL_PAYMENTS_LEGAL_APPROVED, false)) {
    throw new Error(
      "ENABLE_REAL_PAYMENTS=true in production requires REAL_PAYMENTS_LEGAL_APPROVED=true after legal review. Do not set that flag in the repository.",
    );
  }
}

/** Flags y kill switches. La API los sirve; la UI no lee env. */
export type FeatureFlagSnapshot = {
  enableRealPayments: boolean;
  enablePayouts: boolean;
  enableCollections: boolean;
  enablePrices: boolean;
  enableWishlist: boolean;
  enableScanner: boolean;
  enableStores: boolean;
  enableAuctions: boolean;
  enableSellerPlans: boolean;
  disableCheckout: boolean;
  disableNewListings: boolean;
  disablePayouts: boolean;
  disableRefundsAutomation: boolean;
  jobsEnabled: boolean;
  refundRetryJobEnabled: boolean;
  errorTrackingEnabled: boolean;
  enableGoogleAuth: boolean;
  enableAppleAuth: boolean;
  authStubOauth: boolean;
  showSyntheticCatalog: boolean;
};

export function loadFeatureFlags(env: NodeJS.Dict<string> = process.env): FeatureFlagSnapshot {
  return {
    enableRealPayments: envFlag(env.ENABLE_REAL_PAYMENTS, false),
    enablePayouts: envFlag(env.ENABLE_PAYOUTS, env.NODE_ENV !== "production"),
    enableCollections: envFlag(env.ENABLE_COLLECTIONS, true),
    enablePrices: envFlag(env.ENABLE_PRICES, true),
    enableWishlist: envFlag(env.ENABLE_WISHLIST, true),
    enableScanner: envFlag(env.ENABLE_SCANNER, false),
    enableStores: envFlag(env.ENABLE_STORES, false),
    enableAuctions: envFlag(env.ENABLE_AUCTIONS, false),
    enableSellerPlans: envFlag(env.ENABLE_SELLER_PLANS, true),
    disableCheckout: envFlag(env.DISABLE_CHECKOUT, false),
    disableNewListings: envFlag(env.DISABLE_NEW_LISTINGS, false),
    disablePayouts: envFlag(env.DISABLE_PAYOUTS, false),
    disableRefundsAutomation: envFlag(env.DISABLE_REFUNDS_AUTOMATION, false),
    jobsEnabled: envFlag(env.JOBS_ENABLED, env.NODE_ENV !== "test"),
    refundRetryJobEnabled: envFlag(env.ENABLE_REFUND_RETRY_JOB, false),
    errorTrackingEnabled: envFlag(env.ERROR_TRACKING_ENABLED, false),
    enableGoogleAuth: envFlag(env.ENABLE_GOOGLE_AUTH, false),
    enableAppleAuth: envFlag(env.ENABLE_APPLE_AUTH, false),
    authStubOauth: envFlag(env.AUTH_STUB_OAUTH, false),
    showSyntheticCatalog: envFlag(env.SHOW_SYNTHETIC_CATALOG, true),
  };
}

export function publicFeatureFlags(flags: FeatureFlagSnapshot) {
  return {
    enableCollections: flags.enableCollections,
    enablePrices: flags.enablePrices,
    enableWishlist: flags.enableWishlist,
    enableScanner: flags.enableScanner,
    enableStores: flags.enableStores,
    enableAuctions: flags.enableAuctions,
    enableSellerPlans: flags.enableSellerPlans,
    enablePayouts: flags.enablePayouts && !flags.disablePayouts,
    paymentsSandbox: !flags.enableRealPayments,
    enableGoogleAuth: flags.enableGoogleAuth,
    enableAppleAuth: flags.enableAppleAuth,
    authStub: flags.authStubOauth,
  };
}

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim() ?? "").filter(Boolean))];
}

export function googleClientAudiences(env: NodeJS.Dict<string> = process.env): string[] {
  return uniqueNonEmpty([
    env.GOOGLE_CLIENT_ID_WEB,
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_ID_IOS,
    env.GOOGLE_CLIENT_ID_ANDROID,
  ]);
}

export function appleClientAudiences(env: NodeJS.Dict<string> = process.env): string[] {
  return uniqueNonEmpty([env.APPLE_CLIENT_ID, env.APPLE_CLIENT_ID_IOS, env.APPLE_CLIENT_ID_SERVICE]);
}

export function assertOauthRuntimeConfig(env: NodeJS.Dict<string> = process.env): void {
  const nodeEnv = env.NODE_ENV ?? "development";
  const appEnv = env.APP_ENV ?? "";
  const strict = nodeEnv === "production" || nodeEnv === "staging" || appEnv === "staging" || appEnv === "production";
  const flags = loadFeatureFlags(env);

  if (flags.authStubOauth && (nodeEnv === "production" || flags.enableRealPayments)) {
    throw new Error("AUTH_STUB_OAUTH is forbidden in production and when real payments are enabled");
  }
  if (strict && flags.enableGoogleAuth && googleClientAudiences(env).length === 0) {
    throw new Error("ENABLE_GOOGLE_AUTH=true requires GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID_WEB/IOS/ANDROID");
  }
  if (strict && flags.enableAppleAuth && appleClientAudiences(env).length === 0) {
    throw new Error("ENABLE_APPLE_AUTH=true requires APPLE_CLIENT_ID");
  }
}

function envTrimmed(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function isStrictDeployEnv(env: NodeJS.Dict<string> = process.env): boolean {
  const nodeEnv = env.NODE_ENV ?? "development";
  const appEnv = env.APP_ENV ?? "";
  return nodeEnv === "production" || nodeEnv === "staging" || appEnv === "staging" || appEnv === "production";
}

/** R2 (docs) o S3/Minio compatible. */
export function objectStorageConfigured(env: NodeJS.Dict<string> = process.env): boolean {
  const r2 =
    Boolean(envTrimmed(env.R2_ACCOUNT_ID)) &&
    Boolean(envTrimmed(env.R2_ACCESS_KEY_ID)) &&
    Boolean(envTrimmed(env.R2_SECRET_ACCESS_KEY)) &&
    Boolean(envTrimmed(env.R2_BUCKET));
  const s3 =
    Boolean(envTrimmed(env.S3_ENDPOINT)) &&
    Boolean(envTrimmed(env.S3_ACCESS_KEY_ID)) &&
    Boolean(envTrimmed(env.S3_SECRET_ACCESS_KEY)) &&
    Boolean(envTrimmed(env.S3_BUCKET));
  return r2 || s3;
}

export function mailDeliveryConfigured(env: NodeJS.Dict<string> = process.env): boolean {
  return Boolean(envTrimmed(env.RESEND_API_KEY)) || Boolean(envTrimmed(env.SMTP_HOST));
}

/**
 * B1: staging/production no arrancan sin storage y correo.
 * Staging nunca habilita pagos reales.
 */
export function assertStagingRuntimeDeps(env: NodeJS.Dict<string> = process.env): void {
  if (!isStrictDeployEnv(env)) return;
  if (!objectStorageConfigured(env)) {
    throw new Error(
      "staging/production requires object storage: R2_ACCOUNT_ID+R2_ACCESS_KEY_ID+R2_SECRET_ACCESS_KEY+R2_BUCKET or S3_ENDPOINT+S3_ACCESS_KEY_ID+S3_SECRET_ACCESS_KEY+S3_BUCKET",
    );
  }
  if (!mailDeliveryConfigured(env)) {
    throw new Error("staging/production requires RESEND_API_KEY or SMTP_HOST");
  }
  const staging = (env.NODE_ENV ?? "") === "staging" || (env.APP_ENV ?? "") === "staging";
  if (staging && envFlag(env.ENABLE_REAL_PAYMENTS, false)) {
    throw new Error("ENABLE_REAL_PAYMENTS must be false in staging");
  }
}

export type StagingOperatorReport = {
  blockers: string[];
  warnings: string[];
};

function catchMessage(run: () => void, into: string[]): void {
  try {
    run();
  } catch (error) {
    into.push(error instanceof Error ? error.message : String(error));
  }
}

function looksLikePlaceholderHost(url: string): boolean {
  return /example\.test|localhost|127\.0\.0\.1|\.local(?:[:/]|$)/i.test(url);
}

/**
 * Operator checklist for B1. Does not provision hosting.
 * `blockers` must be empty before pointing testers at the URL.
 */
export function collectStagingOperatorReport(env: NodeJS.Dict<string> = process.env): StagingOperatorReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  catchMessage(() => assertOauthRuntimeConfig(env), blockers);
  catchMessage(() => assertErrorTrackingConfig(env), blockers);
  catchMessage(() => assertRealPaymentsLegalGate(env), blockers);

  if (isStrictDeployEnv(env)) {
    if (!objectStorageConfigured(env)) {
      blockers.push(
        "staging/production requires object storage: R2_ACCOUNT_ID+R2_ACCESS_KEY_ID+R2_SECRET_ACCESS_KEY+R2_BUCKET or S3_ENDPOINT+S3_ACCESS_KEY_ID+S3_SECRET_ACCESS_KEY+S3_BUCKET",
      );
    }
    if (!mailDeliveryConfigured(env)) {
      blockers.push("staging/production requires RESEND_API_KEY or SMTP_HOST");
    }
    const staging = (env.NODE_ENV ?? "") === "staging" || (env.APP_ENV ?? "") === "staging";
    if (staging && envFlag(env.ENABLE_REAL_PAYMENTS, false)) {
      blockers.push("ENABLE_REAL_PAYMENTS must be false in staging");
    }
  }

  const jwt = envTrimmed(env.JWT_ACCESS_SECRET);
  if (jwt.length < 32 || /change-me|changeme|dev-only|replace-me/i.test(jwt)) {
    blockers.push("JWT_ACCESS_SECRET must be ≥32 characters and not a placeholder");
  }
  if (!envTrimmed(env.DATABASE_URL)) {
    blockers.push("DATABASE_URL is empty");
  }

  for (const key of ["APP_WEB_URL", "APP_ADMIN_URL", "API_PUBLIC_URL"] as const) {
    const value = envTrimmed(env[key]);
    if (!value) {
      blockers.push(`${key} is empty`);
      continue;
    }
    if (isStrictDeployEnv(env) && !value.startsWith("https://")) {
      blockers.push(`${key} must be HTTPS in staging/production`);
    }
    if (looksLikePlaceholderHost(value)) {
      warnings.push(`${key} still looks local or placeholder (${value})`);
    }
  }

  if (!envTrimmed(env.CORS_ORIGINS)) {
    warnings.push("CORS_ORIGINS is empty");
  } else if (env.CORS_ORIGINS?.includes("*")) {
    blockers.push("CORS_ORIGINS must be an explicit allowlist (no *)");
  }

  if (isStrictDeployEnv(env) && !envTrimmed(env.ADMIN_IP_ALLOWLIST)) {
    warnings.push("ADMIN_IP_ALLOWLIST is empty — do not publish admin on the internet without it or a VPN");
  }

  if (envFlag(env.ENABLE_SCANNER, false) || envFlag(env.ENABLE_STORES, false) || envFlag(env.ENABLE_AUCTIONS, false)) {
    blockers.push("ENABLE_SCANNER / ENABLE_STORES / ENABLE_AUCTIONS must stay false during the beta freeze");
  }

  if (isStrictDeployEnv(env) && envFlag(env.AUTH_STUB_OAUTH, false)) {
    blockers.push("AUTH_STUB_OAUTH must be false in staging/production");
  }

  if (isStrictDeployEnv(env) && envFlag(env.SHOW_SYNTHETIC_CATALOG, true)) {
    warnings.push(
      "Synthetic showcase catalog is visible in staging. Set SHOW_SYNTHETIC_CATALOG=false so Ember Pup / Andes Demo / Test Mon stay out of the public catalog.",
    );
  }

  if (isStrictDeployEnv(env) && /localhost|127\.0\.0\.1/i.test(envTrimmed(env.CORS_ORIGINS))) {
    warnings.push("CORS_ORIGINS still includes localhost — testers will not use that origin");
  }

  if (isStrictDeployEnv(env)) {
    const apiOrigin = envTrimmed(env.API_ORIGIN);
    if (!apiOrigin) {
      warnings.push(
        "API_ORIGIN is empty — Next web/admin will rewrite /v1 to http://localhost:4000. Set it to the public API HTTPS origin.",
      );
    } else if (looksLikePlaceholderHost(apiOrigin) || /localhost|127\.0\.0\.1/i.test(apiOrigin)) {
      warnings.push(`API_ORIGIN still looks local or placeholder (${apiOrigin})`);
    }
  }

  if (envFlag(env.ENABLE_GOOGLE_AUTH, false) === false && envFlag(env.ENABLE_APPLE_AUTH, false) === false) {
    warnings.push("Google/Apple auth flags are off — testers will use email/password (OK for B1)");
  }

  if (isStrictDeployEnv(env)) {
    const contact = envTrimmed(env.LEGAL_CONTACT_EMAIL) || "soporte@localhost";
    const privacy = envTrimmed(env.LEGAL_PRIVACY_EMAIL) || "privacidad@localhost";
    if (contact.includes("localhost") || privacy.includes("localhost")) {
      warnings.push(
        "LEGAL_CONTACT_EMAIL / LEGAL_PRIVACY_EMAIL still look like localhost — set them on API, web and admin",
      );
    }
  }

  return { blockers: [...new Set(blockers)], warnings: [...new Set(warnings)] };
}

/** B5: the flag is not a no-op. Tracking on without DSN fails closed. */
export function assertErrorTrackingConfig(env: NodeJS.Dict<string> = process.env): void {
  if (!envFlag(env.ERROR_TRACKING_ENABLED, false)) return;
  if (!envTrimmed(env.SENTRY_DSN)) {
    throw new Error("ERROR_TRACKING_ENABLED=true requires SENTRY_DSN");
  }
}

export {
  CATALOG_FILTER_SUPPORTS,
  CATALOG_FILTER_TIERS,
  CATALOG_FILTER_TYPES,
  CATALOG_SOURCE_QUALITIES,
  COMMON_CARD_FILTERS,
  COMMON_MARKETPLACE_FILTERS,
  COMMON_ONLY_DEFINITION,
  GAME_FILTER_DEFINITIONS,
  SEARCH_SORTS,
  SYNTHETIC_ATTRIBUTE_SOURCES,
  catalogFilterByKey,
  getGameFilterDefinition,
  isCommonSearchKey,
  isKnownCatalogAttrKey,
  isFilterVisible,
  isFilterVisible as filterIsVisible,
  isSyntheticCardAttributes,
  labelForFilterValue,
  normalizeCatalogCode,
  presentAttributeFields,
  resolveAttrFilterKey,
  sortAllowedForGame,
} from "./catalog-filters";
export {
  NO_OFFICIAL_FLAVOR_COPY,
  NO_OFFICIAL_FLAVOR_STATUS,
  presentCardLore,
} from "./card-lore";
export type { CardLoreView } from "./card-lore";
export type {
  CatalogFilterDef,
  CatalogFilterGroup,
  CatalogFilterRule,
  CatalogFilterSource,
  CatalogFilterSupport,
  CatalogFilterTier,
  CatalogFilterType,
  CatalogFilterVisibleWhen,
  CatalogSourceQuality,
  GameFilterDefinition,
  SearchSort,
} from "./catalog-filters";

export {
  apiHelmetOptions,
  buildContentSecurityPolicy,
  clientIpFromForwarded,
  enableHstsFromEnv,
  ipAllowlistAllows,
  nextDocumentHeaders,
  parseIpAllowlist,
  safeInternalPath,
} from "./http-security";
export type { NextSecurityHeaderOptions } from "./http-security";


