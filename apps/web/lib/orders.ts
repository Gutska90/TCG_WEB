import type { CheckoutView, OrderView, Paginated, SellerRatingView } from "@tcg/types";
import type { ShippingMethod } from "@tcg/config";
import { api } from "./api";

export function createCheckout(
  shippingSelections: Array<{ sellerId: string; method: ShippingMethod; addressId?: string }>,
): Promise<CheckoutView> {
  return api<CheckoutView>("/v1/checkout", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ shippingSelections }),
  });
}

export function getCheckout(id: string): Promise<CheckoutView> {
  return api<CheckoutView>(`/v1/checkouts/${id}`);
}

export function simulatePayment(checkoutId: string): Promise<CheckoutView> {
  return api<CheckoutView>("/v1/payments/simulate", {
    method: "POST",
    body: JSON.stringify({ checkoutId }),
  });
}

export function listOrders(as: "buyer" | "seller"): Promise<Paginated<OrderView>> {
  return api<Paginated<OrderView>>(`/v1/orders?as=${as}&pageSize=50`);
}

export function getOrder(id: string): Promise<OrderView> {
  return api<OrderView>(`/v1/orders/${id}`);
}

export function postOrder(id: string, action: string, body: Record<string, string> = {}): Promise<OrderView> {
  return api<OrderView>(`/v1/orders/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function rateOrder(
  id: string,
  input: { stars: number; comment?: string; isPublic?: boolean },
): Promise<SellerRatingView> {
  return api<SellerRatingView>(`/v1/orders/${id}/rating`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
