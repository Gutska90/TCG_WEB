import type { ListingView, Paginated, PriceSuggestionView } from "@tcg/types";
import { catalogGet } from "./catalog";

export type PublicListingsQuery = {
  variantId?: string;
  sellerId?: string;
  q?: string;
  game?: string;
  set?: string;
  condition?: string;
  sort?: "priceAsc" | "priceDesc" | "newest";
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
  if (input.sort) params.set("sort", input.sort);
  params.set("page", String(input.page ?? 1));
  params.set("pageSize", String(input.pageSize ?? 40));
  return catalogGet<Paginated<ListingView>>(`/v1/listings?${params.toString()}`, false);
}

export function sellerStoreHref(slug: string, input: Omit<PublicListingsQuery, "sellerId" | "variantId">) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.game) params.set("game", input.game);
  if (input.set) params.set("set", input.set);
  if (input.condition) params.set("condition", input.condition);
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
