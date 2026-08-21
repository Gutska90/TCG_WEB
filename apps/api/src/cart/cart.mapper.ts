import type { CartItemIssue, CartItemView, CartSellerGroupView, CartView } from "@tcg/types";
import { listingInclude, toListingView } from "../listings/listing.mapper";

export const cartItemInclude = {
  listing: { include: listingInclude },
} as const;

type CartItemRow = {
  listingId: string;
  quantity: number;
  listing: Parameters<typeof toListingView>[0] & {
    sellerId: string;
    status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD" | "CANCELLED";
  };
};

export function availableQty(listing: { quantity: number; quantityReserved: number }): number {
  return Math.max(0, listing.quantity - listing.quantityReserved);
}

export function toCartItemView(row: CartItemRow, actorUserId?: string): CartItemView {
  const listing = toListingView(row.listing);
  const available = availableQty(row.listing);
  let issue: CartItemIssue | null = null;
  if (actorUserId && row.listing.sellerId === actorUserId) {
    issue = "OWN_LISTING";
  } else if (row.listing.status !== "ACTIVE") {
    issue = "LISTING_NOT_ACTIVE";
  } else if (row.quantity > available) {
    issue = "LISTING_INSUFFICIENT_STOCK";
  }
  const purchasable = issue == null;
  return {
    listingId: row.listingId,
    quantity: row.quantity,
    lineTotalClp: purchasable ? listing.priceClp * row.quantity : 0,
    purchasable,
    issue,
    listing,
  };
}

export function toCartView(
  cartId: string,
  rows: CartItemRow[],
  actorUserId?: string,
): CartView {
  const items = rows.map((row) => toCartItemView(row, actorUserId));
  const bySeller = new Map<string, CartSellerGroupView>();
  for (const item of items) {
    const existing = bySeller.get(item.listing.seller.id);
    if (existing) {
      existing.items.push(item);
      existing.subtotalClp += item.lineTotalClp;
    } else {
      bySeller.set(item.listing.seller.id, {
        seller: item.listing.seller,
        items: [item],
        subtotalClp: item.lineTotalClp,
      });
    }
  }
  const groups = [...bySeller.values()];
  return {
    id: cartId,
    groups,
    items,
    productTotalClp: items.reduce((sum, item) => sum + item.lineTotalClp, 0),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}
