import { z } from "zod";
import {
  CARD_CONDITIONS,
  CARD_FINISHES,
  CARD_LANGUAGES,
  LISTING_STATUSES,
  ORDER_STATUSES,
  LEDGER_ENTRY_TYPES,
  PAYMENT_STATUSES,
  PAYOUT_STATUSES,
  DISPUTE_REASONS,
  DISPUTE_EVIDENCE_MIMES,
  DISPUTE_EVIDENCE_TYPES,
  DISPUTE_STATUSES,
  LISTING_IMAGE_MIMES,
  AVATAR_MIMES,
  FEEDBACK_CATEGORIES,
  PLATFORM,
  PRICE_RANGES,
  NOTIFICATION_TYPES,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  RECONCILIATION_ISSUE_STATUSES,
  RECONCILIATION_ISSUE_TYPES,
  RECONCILIATION_SEVERITIES,
  REFUND_STATUSES,
  ROLES,
  SHIPPING_METHODS,
} from "@tcg/config";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
});

export const readyResponseSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
});

export const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(PLATFORM.passwordMinLength).max(200),
  displayName: z.string().trim().min(2).max(80),
  acceptTerms: z.literal(true),
  marketingOptIn: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(PLATFORM.passwordMinLength).max(200),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(10),
  acceptTerms: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
});

export const appleAuthSchema = z.object({
  identityToken: z.string().min(10),
  email: z.string().trim().email().max(255).optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
  acceptTerms: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
});

export const linkGoogleSchema = z.object({
  idToken: z.string().min(10),
});

export const linkAppleSchema = z.object({
  identityToken: z.string().min(10),
});

export const unlinkIdentityParamSchema = z.enum(["GOOGLE", "APPLE"]);

export const setPasswordSchema = z.object({
  password: z.string().min(PLATFORM.passwordMinLength).max(200),
  currentPassword: z.string().min(1).max(200).optional(),
});

export const testOauthSchema = z.object({
  provider: z.enum(["GOOGLE", "APPLE"]),
  email: z.string().trim().email().max(255).optional(),
  subject: z.string().trim().min(3).max(120),
  emailVerified: z.boolean().optional().default(true),
  displayName: z.string().trim().min(2).max(80).optional(),
  acceptTerms: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
});

export const linkTestOauthSchema = z.object({
  provider: z.enum(["GOOGLE", "APPLE"]),
  subject: z.string().trim().min(3).max(120),
});

export const patchMeSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  comuna: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;
export type LinkGoogleInput = z.infer<typeof linkGoogleSchema>;
export type LinkAppleInput = z.infer<typeof linkAppleSchema>;
export type UnlinkIdentityParam = z.infer<typeof unlinkIdentityParamSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type TestOauthInput = z.infer<typeof testOauthSchema>;
export type LinkTestOauthInput = z.infer<typeof linkTestOauthSchema>;
export type PatchMeInput = z.infer<typeof patchMeSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PLATFORM.searchPageSizeDefault),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const variantPricesQuerySchema = z.object({
  range: z.enum(PRICE_RANGES).default("3m"),
});

export type VariantPricesQuery = z.infer<typeof variantPricesQuerySchema>;

function emptyToUndefined(value: unknown): unknown {
  return value === "" || value === null ? undefined : value;
}

export const searchCardsQuerySchema = paginationQuerySchema.extend({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  game: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  set: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  rarity: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  language: z.preprocess(emptyToUndefined, z.enum(CARD_LANGUAGES).optional()),
  finish: z.preprocess(emptyToUndefined, z.enum(CARD_FINISHES).optional()),
  sort: z.preprocess(
    emptyToUndefined,
    z.enum(["relevance", "releasedAt", "price"]).default("relevance"),
  ),
  priceMin: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  priceMax: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
});

export type SearchCardsQuery = z.infer<typeof searchCardsQuerySchema>;

export const sellerOnboardingSchema = z.object({
  recipientName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional(),
  comuna: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(12).optional(),
  acceptTerms: z.literal(true),
});

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(40).default("Principal"),
  recipientName: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(20),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().max(120).optional(),
  comuna: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(12).optional(),
  isDefaultShipping: z.boolean().optional(),
});

export const createFileUploadSchema = z.object({
  mime: z.string().trim().min(3).max(120),
  size: z.number().int().positive().max(PLATFORM.listingMaxImageBytes),
  purpose: z.enum(["LISTING", "AVATAR", "DISPUTE_EVIDENCE"]),
}).superRefine((value, ctx) => {
  const allowed =
    value.purpose === "DISPUTE_EVIDENCE"
      ? DISPUTE_EVIDENCE_MIMES
      : value.purpose === "AVATAR"
        ? AVATAR_MIMES
        : LISTING_IMAGE_MIMES;
  if (!(allowed as readonly string[]).includes(value.mime)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de archivo no permitido", path: ["mime"] });
  }
  if (value.purpose === "DISPUTE_EVIDENCE" && value.size > PLATFORM.disputeEvidenceMaxBytes) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Archivo demasiado grande", path: ["size"] });
  }
});

export const createListingSchema = z
  .object({
    variantId: z.string().uuid(),
    condition: z.enum(CARD_CONDITIONS),
    quantity: z.number().int().min(1).max(9999),
    priceClp: z.number().int().min(1),
    imageFileIds: z.array(z.string().uuid()).min(PLATFORM.listingMinImages).max(PLATFORM.listingMaxImages),
    allowsMeetup: z.boolean(),
    allowsShipping: z.boolean(),
    description: z.string().trim().max(2000).optional(),
    sourceCollectionItemId: z.string().uuid().optional(),
    graded: z.boolean().optional(),
    grader: z.string().trim().max(40).optional(),
    grade: z.string().trim().max(16).optional(),
  })
  .refine((value) => value.allowsMeetup || value.allowsShipping, {
    message: "Elige retiro, envío o ambos",
    path: ["allowsShipping"],
  })
  .refine((value) => !value.graded || Boolean(value.grader && value.grade), {
    message: "Graded requiere grader y grade",
    path: ["grader"],
  });

export const patchListingSchema = z
  .object({
    condition: z.enum(CARD_CONDITIONS).optional(),
    quantity: z.number().int().min(1).max(9999).optional(),
    priceClp: z.number().int().min(1).optional(),
    imageFileIds: z
      .array(z.string().uuid())
      .min(PLATFORM.listingMinImages)
      .max(PLATFORM.listingMaxImages)
      .optional(),
    allowsMeetup: z.boolean().optional(),
    allowsShipping: z.boolean().optional(),
    description: z.string().trim().max(2000).optional(),
    graded: z.boolean().optional(),
    grader: z.string().trim().max(40).nullable().optional(),
    grade: z.string().trim().max(16).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nada que actualizar" });

export const listListingsQuerySchema = paginationQuerySchema.extend({
  variantId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  sellerId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  condition: z.preprocess(emptyToUndefined, z.enum(CARD_CONDITIONS).optional()),
  minPrice: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
  maxPrice: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
});

export const putCartItemSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.number().int().min(1).max(9999),
});

export const listingIdParamSchema = z.string().uuid();

export const uuidParamSchema = z.string().uuid();

export const checkoutSchema = z.object({
  shippingSelections: z
    .array(
      z.object({
        sellerId: z.string().uuid(),
        method: z.enum(SHIPPING_METHODS),
        addressId: z.string().uuid().optional(),
      }),
    )
    .min(1),
});

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  as: z.enum(["buyer", "seller"]),
});

export const shipOrderSchema = z.object({
  trackingCode: z.string().trim().max(80).optional(),
  meetupPlace: z.string().trim().max(200).optional(),
  meetupAt: z.string().datetime().optional(),
});

export const shippingQuoteQuerySchema = z.object({
  sellerId: z.string().uuid(),
  method: z.enum(SHIPPING_METHODS),
  comuna: z.string().trim().min(2).max(80),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/** Admin 10B: motivo obligatorio; el monto nunca viaja en el body. */
export const adminCancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const adminRetryRefundSchema = z.object({}).strict();

export const disputeOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const mercadopagoPreferenceSchema = z.object({
  checkoutId: z.string().uuid(),
});

export const simulatePaymentSchema = z.object({
  checkoutId: z.string().uuid(),
});

export const createRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export type PutCartItemInput = z.infer<typeof putCartItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ShipOrderInput = z.infer<typeof shipOrderSchema>;
export type ShippingQuoteQuery = z.infer<typeof shippingQuoteQuerySchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type AdminCancelOrderInput = z.infer<typeof adminCancelOrderSchema>;
export type DisputeOrderInput = z.infer<typeof disputeOrderSchema>;
export type MercadopagoPreferenceInput = z.infer<typeof mercadopagoPreferenceSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
export type CreateRatingInput = z.infer<typeof createRatingSchema>;

export const adminListQuerySchema = paginationQuerySchema.extend({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
});

export const adminOrdersQuerySchema = adminListQuerySchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(ORDER_STATUSES).optional()),
});

export const adminPaymentsQuerySchema = adminListQuerySchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(PAYMENT_STATUSES).optional()),
});

export const adminRefundsQuerySchema = adminListQuerySchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(REFUND_STATUSES).optional()),
});

export const adminUsersQuerySchema = adminListQuerySchema.extend({
  role: z.preprocess(emptyToUndefined, z.enum(ROLES).optional()),
  banned: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
});

export const adminListingsQuerySchema = adminListQuerySchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(LISTING_STATUSES).optional()),
});

export const createAdminPayoutSchema = z
  .object({
    sellerId: z.string().uuid(),
    orderIds: z.array(z.string().uuid()).max(200).optional(),
  })
  .strict();

export const adminPayoutReasonSchema = z
  .object({
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

export const adminPayoutFailSchema = z
  .object({
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const adminMarkPayoutPaidSchema = z
  .object({
    providerRef: z.string().trim().min(1).max(120),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict();

export const adminLedgerAdjustmentSchema = z
  .object({
    sellerId: z.string().uuid(),
    amountClp: z.number().int().refine((value) => value !== 0, "amountClp no puede ser 0"),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const adminPayoutsQuerySchema = paginationQuerySchema.extend({
  sellerId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  status: z.preprocess(emptyToUndefined, z.enum(PAYOUT_STATUSES).optional()),
});

export const adminLedgerQuerySchema = paginationQuerySchema.extend({
  sellerId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  entryType: z.preprocess(emptyToUndefined, z.enum(LEDGER_ENTRY_TYPES).optional()),
  orderId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  paymentId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  refundId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  payoutId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
  from: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
  to: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
});

export const adminReconRunSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    hours: z.number().int().min(1).max(168).optional(),
  })
  .strict()
  .refine((value) => !(value.from && value.hours), {
    message: "Usa from/to o hours, no ambos",
  });

export const adminReconIssuesQuerySchema = paginationQuerySchema.extend({
  severity: z.preprocess(emptyToUndefined, z.enum(RECONCILIATION_SEVERITIES).optional()),
  issueType: z.preprocess(emptyToUndefined, z.enum(RECONCILIATION_ISSUE_TYPES).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(RECONCILIATION_ISSUE_STATUSES).optional()),
  from: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
  to: z.preprocess(emptyToUndefined, z.string().datetime().optional()),
  runId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export const adminReconRunsQuerySchema = paginationQuerySchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(["RUNNING", "COMPLETED", "FAILED"] as const).optional()),
});

export const adminReconResolveSchema = z
  .object({
    note: z.string().trim().min(3).max(1000),
  })
  .strict();

export const openDisputeSchema = z.object({
  reason: z.enum(DISPUTE_REASONS),
  description: z.string().trim().max(2000).optional(),
});

export const disputeMessageSchema = z.object({
  body: z.string().trim().min(1).max(PLATFORM.disputeMaxMessageChars),
  isInternalAdminNote: z.boolean().optional(),
});

export const disputeEvidenceSchema = z.object({
  fileId: z.string().uuid(),
  evidenceType: z.enum(DISPUTE_EVIDENCE_TYPES),
  description: z.string().trim().max(500).optional(),
});

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASONS),
  description: z.string().trim().max(2000).optional(),
});

export const adminDisputesQuerySchema = paginationQuerySchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(DISPUTE_STATUSES).optional()),
  reason: z.preprocess(emptyToUndefined, z.enum(DISPUTE_REASONS).optional()),
});

export const adminReportsQuerySchema = paginationQuerySchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(REPORT_STATUSES).optional()),
  reason: z.preprocess(emptyToUndefined, z.enum(REPORT_REASONS).optional()),
  targetType: z.preprocess(emptyToUndefined, z.enum(REPORT_TARGET_TYPES).optional()),
});

export const adminDisputeStatusSchema = z
  .object({
    status: z.enum(["WAITING_BUYER", "WAITING_SELLER", "UNDER_REVIEW", "CANCELLED"]),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

export const adminDisputeResolveSchema = z
  .object({
    outcome: z.enum(["BUYER", "SELLER", "CANCELLED"]),
    note: z.string().trim().min(3).max(1000),
  })
  .strict();

export const adminReportResolveSchema = z
  .object({
    outcome: z.enum(["RESOLVED", "DISMISSED"]),
    note: z.string().trim().min(3).max(1000),
  })
  .strict();

export const adminModerationReasonSchema = z
  .object({
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type AdminOrdersQuery = z.infer<typeof adminOrdersQuerySchema>;
export type AdminPaymentsQuery = z.infer<typeof adminPaymentsQuerySchema>;
export type AdminRefundsQuery = z.infer<typeof adminRefundsQuerySchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminListingsQuery = z.infer<typeof adminListingsQuerySchema>;
export type CreateAdminPayoutInput = z.infer<typeof createAdminPayoutSchema>;
export type AdminPayoutReasonInput = z.infer<typeof adminPayoutReasonSchema>;
export type AdminPayoutFailInput = z.infer<typeof adminPayoutFailSchema>;
export type AdminMarkPayoutPaidInput = z.infer<typeof adminMarkPayoutPaidSchema>;
export type AdminLedgerAdjustmentInput = z.infer<typeof adminLedgerAdjustmentSchema>;
export type AdminPayoutsQuery = z.infer<typeof adminPayoutsQuerySchema>;
export type AdminLedgerQuery = z.infer<typeof adminLedgerQuerySchema>;
export type AdminReconRunInput = z.infer<typeof adminReconRunSchema>;
export type AdminReconIssuesQuery = z.infer<typeof adminReconIssuesQuerySchema>;
export type AdminReconRunsQuery = z.infer<typeof adminReconRunsQuerySchema>;
export type AdminReconResolveInput = z.infer<typeof adminReconResolveSchema>;
export type OpenDisputeInput = z.infer<typeof openDisputeSchema>;
export type DisputeMessageInput = z.infer<typeof disputeMessageSchema>;
export type DisputeEvidenceInput = z.infer<typeof disputeEvidenceSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type AdminDisputesQuery = z.infer<typeof adminDisputesQuerySchema>;
export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>;
export type AdminDisputeStatusInput = z.infer<typeof adminDisputeStatusSchema>;
export type AdminDisputeResolveInput = z.infer<typeof adminDisputeResolveSchema>;
export type AdminReportResolveInput = z.infer<typeof adminReportResolveSchema>;
export type AdminModerationReasonInput = z.infer<typeof adminModerationReasonSchema>;

export const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(8).max(PLATFORM.feedbackMaxMessageChars),
  screen: z.string().trim().max(120).optional(),
  appVersion: z.string().trim().max(40).optional(),
  requestId: z.string().trim().max(80).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

const purchasedAtSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa fecha YYYY-MM-DD")
  .optional();

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});

export const patchCollectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const createCollectionItemSchema = z.object({
  variantId: z.string().uuid(),
  condition: z.enum(CARD_CONDITIONS),
  quantity: z.number().int().min(1).max(9999),
  purchasePriceClp: z.number().int().min(0).max(99_999_999).optional(),
  purchasedAt: purchasedAtSchema,
  notes: z.string().trim().max(PLATFORM.collectionNotesMaxChars).optional(),
});

export const patchCollectionItemSchema = z
  .object({
    condition: z.enum(CARD_CONDITIONS).optional(),
    quantity: z.number().int().min(1).max(9999).optional(),
    purchasePriceClp: z.number().int().min(0).max(99_999_999).nullable().optional(),
    purchasedAt: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
    notes: z.string().trim().max(PLATFORM.collectionNotesMaxChars).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "Nada que actualizar",
  });

export const listCollectionItemsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  game: z.string().trim().max(80).optional(),
  set: z.string().trim().max(80).optional(),
  condition: z.enum(CARD_CONDITIONS).optional(),
  duplicates: z
    .enum(["true", "false", "1", "0"])
    .optional()
    .transform((value) => value === "true" || value === "1"),
  sort: z.enum(["recent", "name", "estimatedValue", "quantity"]).default("recent"),
});

export const bulkDeleteCollectionItemsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(PLATFORM.collectionBulkMaxIds),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type PatchCollectionInput = z.infer<typeof patchCollectionSchema>;
export type CreateCollectionItemInput = z.infer<typeof createCollectionItemSchema>;
export type PatchCollectionItemInput = z.infer<typeof patchCollectionItemSchema>;
export type ListCollectionItemsQuery = z.infer<typeof listCollectionItemsQuerySchema>;
export type BulkDeleteCollectionItemsInput = z.infer<typeof bulkDeleteCollectionItemsSchema>;

export const upsertWishlistItemSchema = z.object({
  targetPriceClp: z.number().int().min(1).max(99_999_999),
  notifyBelow: z.boolean().optional(),
});

export const patchNotificationPreferenceSchema = z.object({
  type: z.enum(NOTIFICATION_TYPES),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
});

export type UpsertWishlistItemInput = z.infer<typeof upsertWishlistItemSchema>;
export type PatchNotificationPreferenceInput = z.infer<typeof patchNotificationPreferenceSchema>;

export type SellerOnboardingInput = z.infer<typeof sellerOnboardingSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type CreateFileUploadInput = z.infer<typeof createFileUploadSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type PatchListingInput = z.infer<typeof patchListingSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
