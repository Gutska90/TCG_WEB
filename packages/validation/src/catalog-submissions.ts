import { z } from "zod";
import { CATALOG_SUBMISSION_STATUSES, CARD_FINISHES, CARD_LANGUAGES, normalizeWhatsappE164 } from "@tcg/config";

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

const catalogSubmissionAttributesRecord = z
  .record(
    z.string().trim().max(40),
    z.union([z.string().trim().max(160), z.number(), z.boolean(), z.null()]),
  )
  .refine((value) => Object.keys(value).length <= 24, "Demasiados atributos");

export const catalogSubmissionAttributesSchema = catalogSubmissionAttributesRecord.optional().default({});

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

export const adminCatalogApproveSchema = z
  .object({
    reviewNotes: z.string().trim().max(2000).optional(),
    setId: optionalUuid,
    createNewSet: z.boolean().optional(),
    newSetName: z.string().trim().max(120).optional(),
    language: z.enum(CARD_LANGUAGES).optional(),
    finish: z.enum(CARD_FINISHES).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.createNewSet) {
      if (value.setId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Elige edición existente o crear una nueva, no ambas",
          path: ["setId"],
        });
      }
      if (!value.newSetName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Indica el nombre de la edición nueva",
          path: ["newSetName"],
        });
      }
      return;
    }
    if (!value.setId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Elige una edición existente o crea una nueva de forma explícita",
        path: ["setId"],
      });
    }
  });

const patchableUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  z.union([z.string().uuid(), z.null()]).optional(),
);

export const patchMyCatalogSubmissionSchema = z
  .object({
    setId: patchableUuid,
    proposedSetName: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().trim().max(120).nullable().optional(),
    ),
    name: z.string().trim().min(1).max(120).optional(),
    number: z.preprocess((value) => (value === "" ? null : value), z.string().trim().max(40).nullable().optional()),
    rarity: z.preprocess((value) => (value === "" ? null : value), z.string().trim().max(80).nullable().optional()),
    supertype: z.preprocess((value) => (value === "" ? null : value), z.string().trim().max(80).nullable().optional()),
    attributes: catalogSubmissionAttributesRecord.optional(),
    imageUrl: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.union([httpsUrl, z.null()]).optional(),
    ),
    notes: z.preprocess((value) => (value === "" ? null : value), z.string().trim().max(2000).nullable().optional()),
    sourceUrl: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.union([httpsUrl, z.null()]).optional(),
    ),
  })
  .strict();

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

export type CreateCatalogSubmissionInput = z.infer<typeof createCatalogSubmissionSchema>;
export type PatchMyCatalogSubmissionInput = z.infer<typeof patchMyCatalogSubmissionSchema>;
export type ListMyCatalogSubmissionsQuery = z.infer<typeof listMyCatalogSubmissionsQuerySchema>;
export type AdminCatalogSubmissionsQuery = z.infer<typeof adminCatalogSubmissionsQuerySchema>;
export type AdminCatalogReviewInput = z.infer<typeof adminCatalogReviewSchema>;
export type AdminCatalogRejectInput = z.infer<typeof adminCatalogRejectSchema>;
export type AdminCatalogApproveInput = z.infer<typeof adminCatalogApproveSchema>;
