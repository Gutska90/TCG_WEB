import { z } from "zod";
import { CATALOG_SUBMISSION_STATUSES, CARD_CONDITIONS, CARD_FINISHES, CARD_LANGUAGES, normalizeWhatsappE164 } from "@tcg/config";

const optionalUuid = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().uuid().optional(),
);

const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(500)
  .refine((value) => value.startsWith("https://"), "Solo se aceptan URLs https");

export const catalogSubmissionAttributesSchema = z
  .record(
    z.string().trim().max(40),
    z.union([z.string().trim().max(160), z.number(), z.boolean(), z.null()]),
  )
  .refine((value) => Object.keys(value).length <= 24, "Demasiados atributos")
  .optional()
  .default({});

export const createCatalogSubmissionSchema = z
  .object({
    gameId: z.string().uuid(),
    setId: optionalUuid,
    proposedSetName: z.string().trim().max(120).optional(),
    name: z.string().trim().min(1).max(120),
    number: z.string().trim().max(40).optional(),
    rarity: z.string().trim().max(80).optional(),
    supertype: z.string().trim().max(80).optional(),
    attributes: catalogSubmissionAttributesSchema,
    imageUrl: z.preprocess((value) => (value === "" || value === null ? undefined : value), httpsUrl.optional()),
    notes: z.string().trim().max(2000).optional(),
    sourceUrl: z.preprocess((value) => (value === "" || value === null ? undefined : value), httpsUrl.optional()),
  })
  .strict();

export const catalogSubmissionIdParamSchema = z.string().uuid();

export const listMyCatalogSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminCatalogSubmissionsQuerySchema = listMyCatalogSubmissionsQuerySchema.extend({
  status: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.enum(CATALOG_SUBMISSION_STATUSES).optional(),
  ),
  gameId: optionalUuid,
  submittedById: optionalUuid,
  from: z.preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().min(8).max(40).optional()),
  to: z.preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().min(8).max(40).optional()),
});

export const adminCatalogReviewSchema = z.object({
  reviewNotes: z.string().trim().max(2000).optional(),
  setId: optionalUuid,
});

export const adminCatalogRejectSchema = z.object({
  reviewNotes: z.string().trim().min(3).max(2000),
});

export const adminCatalogApproveSchema = z.object({
  reviewNotes: z.string().trim().max(2000).optional(),
  setId: optionalUuid,
  language: z.enum(CARD_LANGUAGES).optional(),
  finish: z.enum(CARD_FINISHES).optional(),
});

export const contactWhatsappSchema = z
  .string()
  .trim()
  .max(32)
  .transform((value, ctx) => {
    if (!value) return "";
    const normalized = normalizeWhatsappE164(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número WhatsApp inválido. Usa formato internacional." });
      return z.NEVER;
    }
    return normalized;
  });

export const bulkListingRowSchema = z.object({
  game: z.string().trim().min(1).max(80),
  set: z.string().trim().min(1).max(80),
  card_number: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  condition: z.enum(CARD_CONDITIONS),
  quantity: z.coerce.number().int().min(1).max(9999),
  price_clp: z.coerce.number().int().min(1).max(99_999_999),
  language: z.enum(CARD_LANGUAGES).optional().default("ES"),
  finish: z.enum(CARD_FINISHES).optional().default("NORMAL"),
});

export const bulkListingPreviewSchema = z.object({
  csv: z.string().trim().min(1).max(500_000),
});

export type CreateCatalogSubmissionInput = z.infer<typeof createCatalogSubmissionSchema>;
export type ListMyCatalogSubmissionsQuery = z.infer<typeof listMyCatalogSubmissionsQuerySchema>;
export type AdminCatalogSubmissionsQuery = z.infer<typeof adminCatalogSubmissionsQuerySchema>;
export type AdminCatalogReviewInput = z.infer<typeof adminCatalogReviewSchema>;
export type AdminCatalogRejectInput = z.infer<typeof adminCatalogRejectSchema>;
export type AdminCatalogApproveInput = z.infer<typeof adminCatalogApproveSchema>;
export type BulkListingRowInput = z.infer<typeof bulkListingRowSchema>;
export type BulkListingPreviewInput = z.infer<typeof bulkListingPreviewSchema>;
