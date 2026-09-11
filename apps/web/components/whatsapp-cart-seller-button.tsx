"use client";

import { useState } from "react";
import { inquiryNumberLabel, whatsappMeHref } from "@tcg/config";
import type { CartView } from "@tcg/types";
import { getCart } from "../lib/cart";
import { createInquiry } from "../lib/inquiries";
import { userFacingError } from "../lib/errors";
import { buttonClassName } from "./ui/button-styles";

export function WhatsappCartSellerButton({
  sellerId,
  onCart,
}: {
  sellerId: string;
  onCart: (cart: CartView) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const cart = await getCart();
      onCart(cart);
      const inquiry = await createInquiry(sellerId, `${window.location.origin}/carrito`);
      const phone = inquiry.seller.contactWhatsapp;
      if (phone) {
        window.open(whatsappMeHref(phone, inquiry.messageText), "_blank", "noopener,noreferrer");
      }
      setNotice(`${inquiryNumberLabel(inquiry.inquiryNumber)} enviada al vendedor. No reserva stock.`);
    } catch (err: unknown) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button type="button" className={buttonClassName("secondary")} disabled={pending} onClick={() => void open()}>
        {pending ? "Preparando…" : "Consultar lote por WhatsApp"}
      </button>
      {notice ? <p className="text-sm text-text-muted">{notice}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
