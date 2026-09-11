"use client";

import { useState } from "react";
import { storeWhatsappMessage, whatsappMeHref } from "@tcg/config";
import { fetchMe } from "../lib/api";
import { buttonClassName } from "./ui/button-styles";

export function WhatsappStoreButton({ phoneE164, storeName }: { phoneE164: string; storeName: string }) {
  async function open() {
    let buyerName: string | null = null;
    try {
      buyerName = (await fetchMe()).displayName;
    } catch {
      buyerName = null;
    }
    const href = whatsappMeHref(
      phoneE164,
      storeWhatsappMessage({
        storeName,
        storeUrl: `${window.location.origin}${window.location.pathname}`,
        buyerName,
      }),
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }
  return (
    <button type="button" className={buttonClassName("secondary")} onClick={() => void open()}>
      Contactar
    </button>
  );
}
