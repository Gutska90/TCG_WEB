import { z } from "zod";
import { CARD_CONDITIONS, CARD_FINISHES, CARD_LANGUAGES, PLATFORM, SHIPPING_METHODS } from "@tcg/config";

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
});

export const appleAuthSchema = z.object({
  identityToken: z.string().min(10),
  email: z.string().trim().email().max(255).optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
});

export const patchMeSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  comuna: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type AppleAuthInput = z.infer<typeof appleAuthSchema>;
export type PatchMeInput = z.infer<typeof patchMeSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PLATFORM.searchPageSizeDefault),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

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
  purpose: z.enum(["LISTING", "AVATAR"]),
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
export type DisputeOrderInput = z.infer<typeof disputeOrderSchema>;
export type MercadopagoPreferenceInput = z.infer<typeof mercadopagoPreferenceSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;
export type CreateRatingInput = z.infer<typeof createRatingSchema>;

export type SellerOnboardingInput = z.infer<typeof sellerOnboardingSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type CreateFileUploadInput = z.infer<typeof createFileUploadSchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type PatchListingInput = z.infer<typeof patchListingSchema>;
export type ListListingsQuery = z.infer<typeof listListingsQuerySchema>;
