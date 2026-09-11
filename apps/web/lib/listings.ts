import type { ListingView, Paginated, PriceSuggestionView } from "@tcg/types";
import { catalogGet } from "./catalog";

export type PublicListingsQuery = {
  variantId?: string;
  sellerId?: string;
  q?: string;
  game?: string;
  set?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  language?: string;
  finish?: string;
  allowsShipping?: boolean;
  allowsMeetup?: boolean;
  cardType?: string;
  raza?: string;
  coste?: number;
  sort?: "relevance" | "priceAsc" | "priceDesc" | "newest" | "nameAsc";
  page?: number;
  pageSize?: number;
};

export function getListings(input: PublicListingsQuery) {
  const params = new URLSearchParams();
  if (input.variantId) params.set("variantId", input.variantId);
  if (input.sellerId) params.set("sellerId", input.sellerId);
  if (input.q) params.set("q", input.q);
  if (input.game) params.set("game", input.game);
  if (input.set) params.set("set", input.set);
  if (input.condition) params.set("condition", input.condition);
  if (input.minPrice) params.set("minPrice", String(input.minPrice));
  if (input.maxPrice) params.set("maxPrice", String(input.maxPrice));
  if (input.language) params.set("language", input.language);
  if (input.finish) params.set("finish", input.finish);
  if (input.allowsShipping != null) params.set("allowsShipping", String(input.allowsShipping));
  if (input.allowsMeetup != null) params.set("allowsMeetup", String(input.allowsMeetup));
  if (input.cardType) params.set("cardType", input.cardType);
  if (input.raza) params.set("raza", input.raza);
  if (input.coste != null) params.set("coste", String(input.coste));
  if (input.sort) params.set("sort", input.sort);
  params.set("page", String(input.page ?? 1));
  params.set("pageSize", String(input.pageSize ?? 40));
  return catalogGet<Paginated<ListingView>>(`/v1/listings?${params.toString()}`, false);
}

export function sellerStoreHref(
  slug: string,
  input: Omit<PublicListingsQuery, "sellerId" | "variantId"> & { tab?: string },
) {
  const params = new URLSearchParams();
  if (input.tab && input.tab !== "productos") params.set("tab", input.tab);
  if (input.q) params.set("q", input.q);
  if (input.game) params.set("game", input.game);
  if (input.set) params.set("set", input.set);
  if (input.condition) params.set("condition", input.condition);
  if (input.minPrice) params.set("minPrice", String(input.minPrice));
  if (input.maxPrice) params.set("maxPrice", String(input.maxPrice));
  if (input.language) params.set("language", input.language);
  if (input.finish) params.set("finish", input.finish);
  if (input.cardType) params.set("cardType", input.cardType);
  if (input.raza) params.set("raza", input.raza);
  if (input.coste != null) params.set("coste", String(input.coste));
  if (input.sort && input.sort !== "priceAsc") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/vendedores/${slug}?${qs}` : `/vendedores/${slug}`;
}

export function getListing(id: string) {
  return catalogGet<ListingView>(`/v1/listings/${id}`, false);
}

export function getPriceSuggestion(variantId: string) {
  return catalogGet<PriceSuggestionView>(`/v1/variants/${variantId}/price-suggestion`, false);
}
