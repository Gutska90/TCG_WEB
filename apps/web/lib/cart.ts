import type { CartView } from "@tcg/types";
import { api } from "./api";

export function getCart(): Promise<CartView> {
  return api<CartView>("/v1/cart");
}

export function putCartItem(listingId: string, quantity: number): Promise<CartView> {
  return api<CartView>("/v1/cart/items", {
    method: "PUT",
    body: JSON.stringify({ listingId, quantity }),
  });
}

export function removeCartItem(listingId: string): Promise<CartView> {
  return api<CartView>(`/v1/cart/items/${listingId}`, { method: "DELETE" });
}
