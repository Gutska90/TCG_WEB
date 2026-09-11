import type { ShippingMethod } from "@tcg/config";
import type {
  AddressView,
  CardDetailView,
  CartView,
  CheckoutView,
  CollectionItemView,
  CollectionSetDetailView,
  CollectionSetProgressView,
  CollectionSummaryView,
  DisputeDetailView,
  DisputeListItem,
  FavoriteView,
  GameView,
  ListingView,
  MeView,
  NotificationListView,
  NotificationPreferenceView,
  OrderView,
  Paginated,
  PriceHistoryView,
  PublicPlatformConfig,
  SearchCardView,
  SellerBalanceView,
  SellerInquiryView,
  SellerRatingView,
  ShippingQuoteView,
  WishlistItemView,
} from "@tcg/types";
import { api } from "./api";

export function fetchConfig() {
  return api<PublicPlatformConfig>("/v1/config");
}

export function fetchGames() {
  return api<GameView[]>("/v1/games");
}

export function searchCards(params: URLSearchParams) {
  return api<Paginated<SearchCardView>>(`/v1/search/cards?${params.toString()}`);
}

export function fetchCard(id: string) {
  return api<CardDetailView>(`/v1/cards/${id}`);
}

export function fetchVariantPrices(variantId: string, range = "3m") {
  return api<PriceHistoryView>(`/v1/variants/${variantId}/prices?range=${range}`);
}

export function fetchListings(params: URLSearchParams) {
  return api<Paginated<ListingView>>(`/v1/listings?${params.toString()}`);
}

export function fetchListing(id: string) {
  return api<ListingView>(`/v1/listings/${id}`);
}

export function fetchCart() {
  return api<CartView>("/v1/cart");
}

export function putCartItem(listingId: string, quantity: number) {
  return api<CartView>("/v1/cart/items", { method: "PUT", body: JSON.stringify({ listingId, quantity }) });
}

export function removeCartItem(listingId: string) {
  return api<CartView>(`/v1/cart/items/${listingId}`, { method: "DELETE" });
}

export function createInquiry(sellerId: string) {
  return api<SellerInquiryView>("/v1/inquiries", {
    method: "POST",
    body: JSON.stringify({ sellerId }),
  });
}

export function listInquiries(as: "buyer" | "seller") {
  return api<Paginated<SellerInquiryView>>(`/v1/me/inquiries?as=${as}&pageSize=50`);
}

export function getInquiry(id: string) {
  return api<SellerInquiryView>(`/v1/inquiries/${id}`);
}

export function quoteShipping(sellerId: string, method: ShippingMethod, comuna: string) {
  const query = new URLSearchParams({ sellerId, method, comuna });
  return api<ShippingQuoteView>(`/v1/shipping/quote?${query.toString()}`);
}

export function createCheckout(
  shippingSelections: Array<{ sellerId: string; method: ShippingMethod; addressId?: string }>,
) {
  return api<CheckoutView>("/v1/checkout", {
    method: "POST",
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify({ shippingSelections }),
  });
}

export function getCheckout(id: string) {
  return api<CheckoutView>(`/v1/checkouts/${id}`);
}

export function simulatePayment(checkoutId: string) {
  return api<CheckoutView>("/v1/payments/simulate", {
    method: "POST",
    body: JSON.stringify({ checkoutId }),
  });
}

export function listOrders(as: "buyer" | "seller") {
  return api<Paginated<OrderView>>(`/v1/orders?as=${as}&pageSize=50`);
}

export function getOrder(id: string) {
  return api<OrderView>(`/v1/orders/${id}`);
}

export function postOrder(id: string, action: string, body: Record<string, string> = {}) {
  return api<OrderView>(`/v1/orders/${id}/${action}`, { method: "POST", body: JSON.stringify(body) });
}

export function rateOrder(id: string, input: { stars: number; comment?: string }) {
  return api<SellerRatingView>(`/v1/orders/${id}/rating`, { method: "POST", body: JSON.stringify(input) });
}

export function fetchFavorites() {
  return api<Paginated<FavoriteView>>("/v1/me/favorites");
}

export function addFavorite(variantId: string) {
  return api(`/v1/me/favorites/${variantId}`, { method: "PUT" });
}

export function removeFavorite(variantId: string) {
  return api(`/v1/me/favorites/${variantId}`, { method: "DELETE" });
}

export function fetchWishlist() {
  return api<Paginated<WishlistItemView>>("/v1/me/wishlist?pageSize=50");
}

export function upsertWishlistItem(variantId: string, targetPriceClp: number) {
  return api<WishlistItemView>(`/v1/me/wishlist/${variantId}`, {
    method: "PUT",
    body: JSON.stringify({ targetPriceClp }),
  });
}

export function removeWishlistItem(variantId: string) {
  return api(`/v1/me/wishlist/${variantId}`, { method: "DELETE" });
}

export function fetchNotifications() {
  return api<NotificationListView>("/v1/me/notifications?pageSize=50");
}

export function markNotificationsRead() {
  return api("/v1/me/notifications/read-all", { method: "POST" });
}

export function fetchNotificationPreferences() {
  return api<NotificationPreferenceView[]>("/v1/me/notification-preferences");
}

export function patchNotificationPreference(input: {
  type: NotificationPreferenceView["type"];
  inApp?: boolean;
  email?: boolean;
}) {
  return api<NotificationPreferenceView>("/v1/me/notification-preferences", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchAddresses() {
  return api<AddressView[]>("/v1/me/addresses");
}

export function fetchBalance() {
  return api<SellerBalanceView>("/v1/me/balance");
}

export function fetchCollectionSummary() {
  return api<CollectionSummaryView>("/v1/me/collection/summary");
}

export function fetchCollectionItems(params: URLSearchParams) {
  return api<Paginated<CollectionItemView>>(`/v1/me/collection/items?${params.toString()}`);
}

export function fetchCollectionItem(id: string) {
  return api<CollectionItemView>(`/v1/me/collection/items/${id}`);
}

export function addCollectionItem(body: {
  variantId: string;
  condition: string;
  quantity: number;
  purchasePriceClp?: number;
  purchasedAt?: string;
  notes?: string;
}) {
  return api<CollectionItemView>("/v1/me/collection/items", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchCollectionItem(
  id: string,
  body: {
    quantity?: number;
    condition?: string;
    purchasePriceClp?: number | null;
    purchasedAt?: string | null;
    notes?: string | null;
  },
) {
  return api<CollectionItemView>(`/v1/me/collection/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteCollectionItem(id: string) {
  return api(`/v1/me/collection/items/${id}`, { method: "DELETE" });
}

export function fetchCollectionSets() {
  return api<CollectionSetProgressView[]>("/v1/me/collection/sets");
}

export function fetchCollectionSet(setId: string) {
  return api<CollectionSetDetailView>(`/v1/me/collection/sets/${setId}?pageSize=40`);
}

export function fetchMyListings() {
  return api<Paginated<ListingView>>("/v1/me/listings");
}

export function fetchMyDisputes() {
  return api<Paginated<DisputeListItem>>("/v1/me/disputes");
}

export function fetchDispute(id: string) {
  return api<DisputeDetailView>(`/v1/disputes/${id}`);
}

export function fetchMe() {
  return api<MeView>("/v1/me");
}
