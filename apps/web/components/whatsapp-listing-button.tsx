"use client";

import { CARD_CONDITION_LABELS, formatClp, type CardCondition, listingWhatsappMessage, whatsappMeHref } from "@tcg/config";
import { fetchMe } from "../lib/api";
import { buttonClassName } from "./ui/button-styles";

export function WhatsappListingButton({
  phoneE164,
  sellerName,
  cardName,
  setName,
  condition,
  priceClp,
  listingPath,
  quantity = 1,
}: {
  phoneE164: string;
  sellerName?: string;
  cardName: string;
  setName: string;
  condition: CardCondition;
  priceClp: number;
  listingPath: string;
  quantity?: number;
}) {
  async function open() {
    let buyerName: string | null = null;
    try {
      buyerName = (await fetchMe()).displayName;
    } catch {
      buyerName = null;
    }
    const qty = Math.max(1, quantity);
    const listingUrl = `${window.location.origin}${listingPath}`;
    const href = whatsappMeHref(
      phoneE164,
      listingWhatsappMessage({
        cardName,
        setName,
        condition: CARD_CONDITION_LABELS[condition],
        priceLabel: formatClp(priceClp * qty),
        listingUrl,
        quantity: qty,
        buyerName,
        sellerName,
      }),
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" className={buttonClassName("secondary")} onClick={() => void open()}>
      Consultar por WhatsApp
    </button>
  );
}
