"use client";

import { formatClp, listingWhatsappMessage, whatsappMeHref } from "@tcg/config";
import { buttonClassName } from "./ui/button-styles";

export function WhatsappListingButton({
  phoneE164,
  cardName,
  setName,
  condition,
  priceClp,
  listingPath,
}: {
  phoneE164: string;
  cardName: string;
  setName: string;
  condition: string;
  priceClp: number;
  listingPath: string;
}) {
  function open() {
    const listingUrl = `${window.location.origin}${listingPath}`;
    const href = whatsappMeHref(
      phoneE164,
      listingWhatsappMessage({
        cardName,
        setName,
        condition,
        priceLabel: formatClp(priceClp),
        listingUrl,
      }),
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" className={buttonClassName("secondary")} onClick={open}>
      Consultar por WhatsApp
    </button>
  );
}
