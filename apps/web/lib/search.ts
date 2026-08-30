import type { Paginated, SearchCardView } from "@tcg/types";
import { catalogGet } from "./catalog";

export type SearchCardsInput = {
  q?: string;
  game?: string;
  set?: string;
  rarity?: string;
  supertype?: string;
  language?: string;
  finish?: string;
  condition?: string;
  hasListings?: boolean;
  sort?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
  attrs?: Record<string, string[]>;
};

const TOP_LEVEL = new Set([
  "q",
  "game",
  "set",
  "rarity",
  "supertype",
  "language",
  "finish",
  "condition",
  "hasListings",
  "sort",
  "priceMin",
  "priceMax",
  "page",
]);

export function searchInputFromParams(raw: Record<string, string | string[] | undefined>): SearchCardsInput {
  const attrs: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith("attr.") || value == null) continue;
    const attrKey = key.slice(5);
    const items = (Array.isArray(value) ? value : [value])
      .flatMap((item) => item.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
    if (items.length) attrs[attrKey] = items;
  }
  const sortRaw = single(raw.sort);
  const sort =
    sortRaw &&
    ["relevance", "releasedAt", "price", "nameAsc", "nameDesc", "hp", "atk", "level", "manaValue"].includes(sortRaw)
      ? sortRaw
      : "relevance";
  return {
    q: single(raw.q)?.trim() || undefined,
    game: single(raw.game)?.trim() || undefined,
    set: single(raw.set)?.trim() || undefined,
    rarity: single(raw.rarity)?.trim() || undefined,
    supertype: single(raw.supertype)?.trim() || undefined,
    language: single(raw.language)?.trim() || undefined,
    finish: single(raw.finish)?.trim() || undefined,
    condition: single(raw.condition)?.trim() || undefined,
    hasListings: single(raw.hasListings) === "true" || single(raw.hasListings) === "1" ? true : undefined,
    sort,
    priceMin: single(raw.priceMin) ? Number(single(raw.priceMin)) || undefined : undefined,
    priceMax: single(raw.priceMax) ? Number(single(raw.priceMax)) || undefined : undefined,
    page: Number(single(raw.page) ?? "1") || 1,
    attrs: Object.keys(attrs).length ? attrs : undefined,
  };
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function applySearchParams(params: URLSearchParams, input: SearchCardsInput): void {
  if (input.q) params.set("q", input.q);
  if (input.game) params.set("game", input.game);
  if (input.set) params.set("set", input.set);
  if (input.rarity) params.set("rarity", input.rarity);
  if (input.supertype) params.set("supertype", input.supertype);
  if (input.language) params.set("language", input.language);
  if (input.finish) params.set("finish", input.finish);
  if (input.condition) params.set("condition", input.condition);
  if (input.hasListings) params.set("hasListings", "true");
  if (input.sort && input.sort !== "relevance") params.set("sort", input.sort);
  if (input.priceMin) params.set("priceMin", String(input.priceMin));
  if (input.priceMax) params.set("priceMax", String(input.priceMax));
  if (input.page && input.page > 1) params.set("page", String(input.page));
  for (const [key, values] of Object.entries(input.attrs ?? {})) {
    if (TOP_LEVEL.has(key) || values.length === 0) continue;
    params.set(`attr.${key}`, values.join(","));
  }
}

export function searchCardsHref(input: SearchCardsInput, pathname = "/buscar"): string {
  const params = new URLSearchParams();
  applySearchParams(params, input);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function searchCards(input: SearchCardsInput) {
  const params = new URLSearchParams();
  applySearchParams(params, { ...input, page: input.page });
  if (input.sort) params.set("sort", input.sort);
  params.set("pageSize", String(input.pageSize ?? 20));
  if (input.page) params.set("page", String(input.page));
  return catalogGet<Paginated<SearchCardView>>(`/v1/search/cards?${params.toString()}`, false);
}

export function hasExtraSearchFilters(input: SearchCardsInput, lockedKeys: string[] = []): boolean {
  const locked = new Set(lockedKeys);
  if (input.q) return true;
  if (input.game && !locked.has("game")) return true;
  if (input.set && !locked.has("set")) return true;
  if (input.rarity || input.supertype || input.language || input.finish || input.condition) return true;
  if (input.hasListings || input.priceMin || input.priceMax) return true;
  return Boolean(input.attrs && Object.keys(input.attrs).length > 0);
}

export function omitSearchFilter(input: SearchCardsInput, key: string): SearchCardsInput {
  const next: SearchCardsInput = { ...input, page: 1 };
  if (key in next && key !== "attrs") {
    delete (next as Record<string, unknown>)[key];
  }
  if (key === "price") {
    delete next.priceMin;
    delete next.priceMax;
  }
  const attrs = { ...(input.attrs ?? {}) };
  delete attrs[key];
  delete attrs[`${key}Min`];
  delete attrs[`${key}Max`];
  next.attrs = Object.keys(attrs).length ? attrs : undefined;
  return next;
}
