"use client";

import { whatsappMeHref } from "@tcg/config";
import { buttonClassName } from "./ui/button-styles";

export function WhatsappStoreButton({ phoneE164, storeName }: { phoneE164: string; storeName: string }) {
  function open() {
    const url = `${window.location.origin}${window.location.pathname}`;
    const href = whatsappMeHref(
      phoneE164,
      `Hola, vi tu tienda ${storeName} en TCG Market Chile.\n\n${url}`,
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" className={buttonClassName("secondary")} onClick={open}>
      Contactar
    </button>
  );
}
