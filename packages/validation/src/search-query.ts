import { z } from "zod";
import { CARD_CONDITIONS, CARD_FINISHES, CARD_LANGUAGES, PLATFORM, SEARCH_SORTS } from "@tcg/config";

function emptyToUndefined(value: unknown): unknown {
  return value === "" || value === null ? undefined : value;
}

function toStringList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function collectSearchQuery(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const input = raw as Record<string, unknown>;
  const attrs: Record<string, string[]> = {};
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith("attr.")) {
      const attrKey = key.slice(5).trim();
      if (!attrKey || attrKey.length > 80) continue;
      const parts = toStringList(value);
      if (parts.length) attrs[attrKey] = parts;
    } else {
      rest[key] = value;
    }
  }
  return { ...rest, attrs: Object.keys(attrs).length ? attrs : undefined };
}

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PLATFORM.searchPageSizeDefault),
});

function optionalBool(value: unknown): unknown {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) return undefined;
  if (normalized === true || normalized === "true" || normalized === "1") return true;
  if (normalized === false || normalized === "false" || normalized === "0") return false;
  return normalized;
}

export const searchCardsQuerySchema = z.preprocess(
  collectSearchQuery,
  paginationQuery.extend({
    q: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
    game: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
    set: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
    rarity: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
    supertype: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
    language: z.preprocess(emptyToUndefined, z.enum(CARD_LANGUAGES).optional()),
    finish: z.preprocess(emptyToUndefined, z.enum(CARD_FINISHES).optional()),
    condition: z.preprocess(emptyToUndefined, z.enum(CARD_CONDITIONS).optional()),
    hasListings: z.preprocess(optionalBool, z.boolean().optional()),
    sort: z.preprocess(emptyToUndefined, z.enum(SEARCH_SORTS).default("relevance")),
    priceMin: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
    priceMax: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
    attrs: z.record(z.string().min(1).max(80), z.array(z.string().min(1).max(80)).min(1).max(20)).optional(),
  }),
);

export type SearchCardsQuery = z.infer<typeof searchCardsQuerySchema>;
