"use client";

import { useState } from "react";
import type { CardCondition } from "@tcg/config";
import { AddToCartButton } from "./add-to-cart-button";
import { QuantityStepper } from "./quantity-stepper";
import { WhatsappListingButton } from "./whatsapp-listing-button";

export function ListingPurchaseActions({
  listingId,
  available,
  whatsapp,
  quantity,
  onQuantityChange,
  showStepper = true,
}: {
  listingId: string;
  available: number;
  whatsapp: {
    phoneE164: string;
    sellerName: string;
    cardName: string;
    setName: string;
    condition: CardCondition;
    priceClp: number;
    listingPath: string;
  } | null;
  quantity?: number;
  onQuantityChange?: (next: number) => void;
  showStepper?: boolean;
}) {
  const [internalQty, setInternalQty] = useState(1);
  const raw = quantity ?? internalQty;
  const qty = Math.min(Math.max(1, raw), Math.max(1, available));

  function setQty(next: number) {
    const clamped = Math.min(Math.max(1, next), Math.max(1, available));
    if (onQuantityChange) onQuantityChange(clamped);
    else setInternalQty(clamped);
  }

  return (
    <div className="flex flex-col gap-2">
      {available > 0 && showStepper ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Cantidad</span>
          <QuantityStepper value={qty} max={available} onChange={setQty} />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <AddToCartButton listingId={listingId} available={available} quantityToAdd={qty} />
        {whatsapp ? (
          <WhatsappListingButton
            phoneE164={whatsapp.phoneE164}
            sellerName={whatsapp.sellerName}
            cardName={whatsapp.cardName}
            setName={whatsapp.setName}
            condition={whatsapp.condition}
            priceClp={whatsapp.priceClp}
            listingPath={whatsapp.listingPath}
            quantity={qty}
          />
        ) : null}
      </div>
    </div>
  );
}
