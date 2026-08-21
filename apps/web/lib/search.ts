import type { Paginated, SearchCardView } from "@tcg/types";
import { catalogGet } from "./catalog";

export type SearchCardsInput = {
  q?: string;
  game?: string;
  set?: string;
  rarity?: string;
  language?: string;
  finish?: string;
  sort?: "relevance" | "releasedAt" | "price";
  priceMin?: number;
  priceMax?: number;
  page?: number;
};

export function searchCardsHref(input: SearchCardsInput): string {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.game) params.set("game", input.game);
  if (input.set) params.set("set", input.set);
  if (input.rarity) params.set("rarity", input.rarity);
  if (input.language) params.set("language", input.language);
  if (input.finish) params.set("finish", input.finish);
  if (input.sort && input.sort !== "relevance") params.set("sort", input.sort);
  if (input.priceMin) params.set("priceMin", String(input.priceMin));
  if (input.priceMax) params.set("priceMax", String(input.priceMax));
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const query = params.toString();
  return query ? `/buscar?${query}` : "/buscar";
}

export function searchCards(input: SearchCardsInput) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.game) params.set("game", input.game);
  if (input.set) params.set("set", input.set);
  if (input.rarity) params.set("rarity", input.rarity);
  if (input.language) params.set("language", input.language);
  if (input.finish) params.set("finish", input.finish);
  if (input.sort) params.set("sort", input.sort);
  if (input.priceMin) params.set("priceMin", String(input.priceMin));
  if (input.priceMax) params.set("priceMax", String(input.priceMax));
  if (input.page) params.set("page", String(input.page));
  params.set("pageSize", "20");
  return catalogGet<Paginated<SearchCardView>>(`/v1/search/cards?${params.toString()}`, false);
}
