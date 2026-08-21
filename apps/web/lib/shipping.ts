import type { ShippingMethod } from "@tcg/config";
import type { ShippingQuoteView } from "@tcg/types";
import { api } from "./api";

export function quoteShipping(
  sellerId: string,
  method: ShippingMethod,
  comuna: string,
): Promise<ShippingQuoteView> {
  const query = new URLSearchParams({ sellerId, method, comuna });
  return api<ShippingQuoteView>(`/v1/shipping/quote?${query.toString()}`);
}
