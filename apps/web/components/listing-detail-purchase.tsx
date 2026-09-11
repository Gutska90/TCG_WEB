"use client";

import { useState } from "react";
import Link from "next/link";
import { CARD_CONDITION_LABELS, CARD_FINISH_LABELS, CARD_LANGUAGE_LABELS, formatReputation } from "@tcg/config";
import type { ListingView } from "@tcg/types";
import { ListingPurchaseActions } from "./listing-purchase-actions";
import { QtyOnImage } from "./qty-on-image";
import { ReportListingButton } from "./report-listing-button";
import { ShareControls } from "./share-controls";
import { CardImage } from "./ui/product-card";
import { Price } from "./ui/price";
import { StatusBadge } from "./ui/badge";

export function ListingDetailPurchase({ listing }: { listing: ListingView }) {
  const [qty, setQty] = useState(1);
  const whatsapp =
    listing.seller.contactWhatsappEnabled && listing.seller.contactWhatsapp
      ? {
          phoneE164: listing.seller.contactWhatsapp,
          sellerName: listing.seller.displayName,
          cardName: listing.variant.card.name,
          setName: listing.variant.card.setName,
          condition: listing.condition,
          priceClp: listing.priceClp,
          listingPath: `/listings/${listing.id}`,
        }
      : null;

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
      <div>
        <QtyOnImage available={listing.available} value={qty} onChange={setQty}>
          <CardImage
            src={listing.variant.card.imageUrl}
            alt={listing.variant.card.name}
            name={listing.variant.card.name}
            gameSlug={listing.variant.card.gameSlug}
            variant="detail"
            priority
          />
        </QtyOnImage>
        <p className="mt-2 text-[11px] text-text-muted">Arte oficial del catálogo</p>
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-medium tracking-tight">{listing.title}</h1>
          <StatusBadge status={listing.status} />
        </div>
        <p className="mt-2 text-text-muted">
          {CARD_CONDITION_LABELS[listing.condition]} · {CARD_LANGUAGE_LABELS[listing.variant.language]} ·{" "}
          {CARD_FINISH_LABELS[listing.variant.finish]}
        </p>
        <Price value={listing.priceClp} size="lg" className="mt-4" />
        <p className="mt-2 text-sm text-text-muted">
          {listing.available} disponible(s) · stock {listing.quantity} ·{" "}
          {listing.allowsMeetup ? "encuentro" : "sin encuentro"} · {listing.allowsShipping ? "envío" : "sin envío"}
        </p>
        <p className="mt-4 text-sm">
          Vendedor:{" "}
          <Link href={`/vendedores/${listing.seller.slug}`} className="underline underline-offset-2">
            {listing.seller.displayName}
          </Link>{" "}
          · {formatReputation(listing.seller.reputation.averageStars, listing.seller.reputation.count)}
        </p>
        {listing.description ? <p className="mt-6 whitespace-pre-wrap">{listing.description}</p> : null}
        {listing.images.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {listing.images.map((image) => (
              <li key={image.fileId}>
                {/* eslint-disable-next-line @next/next/no-img-element -- bytes from API rewrite, not a remote CMS */}
                <img
                  src={image.url}
                  alt={`Foto de la publicación de ${listing.variant.card.name}`}
                  className="w-full rounded-[12px] border border-border bg-surface-elevated object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <p className="mt-1 text-[11px] text-text-muted">Foto de la publicación</p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-8 flex flex-col gap-3">
          <ListingPurchaseActions
            listingId={listing.id}
            available={listing.available}
            whatsapp={whatsapp}
            quantity={qty}
            onQuantityChange={setQty}
            showStepper={false}
          />
          <ShareControls path={`/listings/${listing.id}`} title={listing.title} />
        </div>
        <ReportListingButton listingId={listing.id} />
      </div>
    </div>
  );
}
