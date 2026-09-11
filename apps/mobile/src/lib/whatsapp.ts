import { Linking } from "react-native";
import {
  CARD_CONDITION_LABELS,
  cartSellerWhatsappMessage,
  listingWhatsappMessage,
  formatClp,
  whatsappMeHref,
} from "@tcg/config";
import type { CartSellerGroupView, ListingView, MeView } from "@tcg/types";

export async function openWhatsappHref(href: string): Promise<void> {
  await Linking.openURL(href);
}

export function listingConsultHref(
  listing: ListingView,
  quantity: number,
  buyerName: string | null,
): string | null {
  if (!listing.seller.contactWhatsappEnabled || !listing.seller.contactWhatsapp) return null;
  const qty = Math.max(1, quantity);
  return whatsappMeHref(
    listing.seller.contactWhatsapp,
    listingWhatsappMessage({
      cardName: listing.variant.card.name,
      setName: listing.variant.card.setName,
      condition: CARD_CONDITION_LABELS[listing.condition],
      priceLabel: formatClp(listing.priceClp * qty),
      quantity: qty,
      buyerName,
      sellerName: listing.seller.displayName,
    }),
  );
}

export function cartSellerConsultHref(
  group: CartSellerGroupView,
  me: MeView | null,
): string | null {
  if (!group.seller.contactWhatsappEnabled || !group.seller.contactWhatsapp) return null;
  const lines = group.items.filter((item) => item.purchasable);
  if (lines.length === 0) return null;
  return whatsappMeHref(
    group.seller.contactWhatsapp,
    cartSellerWhatsappMessage({
      sellerName: group.seller.displayName,
      buyerName: me?.displayName ?? null,
      lines: lines.map((item) => ({
        cardName: item.listing.variant.card.name,
        setName: item.listing.variant.card.setName,
        conditionLabel: CARD_CONDITION_LABELS[item.listing.condition],
        quantity: item.quantity,
        lineTotalLabel: formatClp(item.lineTotalClp),
      })),
      subtotalLabel: formatClp(group.subtotalClp),
    }),
  );
}
