"use client";

import { useState } from "react";
import Link from "next/link";
import { CARD_CONDITION_LABELS, CARD_FINISH_LABELS, formatClp, formatReputation } from "@tcg/config";
import type { ListingView } from "@tcg/types";
import { CardImage } from "./ui/product-card";
import { buttonClassName } from "./ui/button-styles";
import { ShareControls } from "./share-controls";
import { ListingPurchaseActions } from "./listing-purchase-actions";
import { QtyOnImage } from "./qty-on-image";

export function ListingOfferCard({ item }: { item: ListingView }) {
  const listingPath = `/listings/${item.id}`;
  const sellerPhoto = item.images[0]?.url;
  const imageSrc = sellerPhoto ?? item.variant.card.imageUrl;
  const setName = item.variant.card.setName;
  const [qty, setQty] = useState(1);
  const whatsapp =
    item.seller.contactWhatsappEnabled && item.seller.contactWhatsapp
      ? {
          phoneE164: item.seller.contactWhatsapp,
          sellerName: item.seller.displayName,
          cardName: item.variant.card.name,
          setName,
          condition: item.condition,
          priceClp: item.priceClp,
          listingPath,
        }
      : null;

  return (
    <article className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-3">
      <QtyOnImage available={item.available} value={qty} onChange={setQty}>
        <Link href={listingPath} className="block min-w-0">
          <CardImage
            src={imageSrc}
            alt={item.variant.card.name}
            name={item.variant.card.name}
            gameSlug={item.variant.card.gameSlug}
            variant="grid"
          />
        </Link>
      </QtyOnImage>
      <p className="text-[10px] leading-tight text-text-muted">
        {sellerPhoto ? "Foto de la publicación" : "Arte de catálogo"}
      </p>
      <div className="min-w-0">
        <Link href={listingPath} className="line-clamp-2 font-medium tracking-tight">
          {item.variant.card.name}
        </Link>
        <p className="mt-1 text-sm text-text-muted">
          {setName} · {item.variant.card.number}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {CARD_CONDITION_LABELS[item.condition]} · {CARD_FINISH_LABELS[item.variant.finish]} · stock {item.available}
        </p>
        <p className="mt-2 font-medium tabular-nums">{formatClp(item.priceClp)}</p>
        <p className="text-xs text-text-muted">
          {item.seller.displayName} · {formatReputation(item.seller.reputation.averageStars, item.seller.reputation.count)}
        </p>
        <p className="text-xs text-text-muted">
          {item.allowsShipping ? "Envío" : "Sin envío"}
          {item.allowsMeetup ? " · Encuentro" : ""}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Link href={listingPath} className={buttonClassName("secondary", "w-fit")}>
          Ver
        </Link>
        <ListingPurchaseActions
          listingId={item.id}
          available={item.available}
          whatsapp={whatsapp}
          quantity={qty}
          onQuantityChange={setQty}
          showStepper={false}
        />
      </div>
      <ShareControls path={listingPath} title={item.variant.card.name} />
    </article>
  );
}
