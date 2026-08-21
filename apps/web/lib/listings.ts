import type { ListingView, Paginated, PriceSuggestionView } from "@tcg/types";
import { catalogGet } from "./catalog";

export function getListings(input: { variantId?: string; sellerId?: string; page?: number }) {
  const params = new URLSearchParams();
  if (input.variantId) params.set("variantId", input.variantId);
  if (input.sellerId) params.set("sellerId", input.sellerId);
  params.set("page", String(input.page ?? 1));
  params.set("pageSize", "40");
  return catalogGet<Paginated<ListingView>>(`/v1/listings?${params.toString()}`, false);
}

export function getListing(id: string) {
  return catalogGet<ListingView>(`/v1/listings/${id}`, false);
}

export function getPriceSuggestion(variantId: string) {
  return catalogGet<PriceSuggestionView>(`/v1/variants/${variantId}/price-suggestion`, false);
}
