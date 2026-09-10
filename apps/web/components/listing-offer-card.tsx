"use client";

import Link from "next/link";
import { CARD_CONDITION_LABELS, formatClp } from "@tcg/config";
import type { ListingView } from "@tcg/types";
import { AddToCartButton } from "./add-to-cart-button";
import { CardImage } from "./ui/product-card";
import { buttonClassName } from "./ui/button-styles";
import { ShareControls } from "./share-controls";
import { WhatsappListingButton } from "./whatsapp-listing-button";

export function ListingOfferCard({ item }: { item: ListingView }) {
  const listingPath = `/listings/${item.id}`;
  return (
    <article className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-3">
      <Link href={listingPath} className="grid grid-cols-[72px_1fr] gap-3">
        <CardImage
          src={item.variant.card.imageUrl}
          alt={item.variant.card.name}
          name={item.variant.card.name}
          gameSlug={item.variant.card.gameSlug}
        />
        <div>
          <p className="font-medium tracking-tight">{item.variant.card.name}</p>
          <p className="mt-1 text-sm text-text-muted">
            {item.variant.card.setSlug} · {item.variant.card.number}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {CARD_CONDITION_LABELS[item.condition]} · {item.variant.finish} · stock {item.available}
          </p>
          <p className="mt-2 font-medium tabular-nums">{formatClp(item.priceClp)}</p>
          <p className="text-xs text-text-muted">
            {item.allowsShipping ? "Envío" : "Sin envío"}
            {item.allowsMeetup ? " · Encuentro" : ""}
          </p>
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={listingPath} className={buttonClassName("secondary")}>
          Ver
        </Link>
        <AddToCartButton listingId={item.id} available={item.available} />
        {item.seller.contactWhatsappEnabled && item.seller.contactWhatsapp ? (
          <WhatsappListingButton
            phoneE164={item.seller.contactWhatsapp}
            cardName={item.variant.card.name}
            setName={item.variant.card.setSlug}
            condition={item.condition}
            priceClp={item.priceClp}
            listingPath={listingPath}
          />
        ) : null}
      </div>
      <ShareControls path={listingPath} title={item.variant.card.name} />
    </article>
  );
}
