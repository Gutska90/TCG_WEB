import Link from "next/link";
import { notFound } from "next/navigation";
import { CARD_CONDITION_LABELS, formatReputation } from "@tcg/config";
import { CatalogRequestError } from "../../../lib/catalog";
import { getListing } from "../../../lib/listings";
import { AddToCartButton } from "../../../components/add-to-cart-button";
import { ReportListingButton } from "../../../components/report-listing-button";
import { CardImage } from "../../../components/ui/product-card";
import { Price } from "../../../components/ui/price";
import { StatusBadge } from "../../../components/ui/badge";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const listing = await getListing(id);
    return (
      <main id="contenido" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-text-muted">
          <Link
            href={`/${listing.variant.card.gameSlug}/${listing.variant.card.setSlug}/${listing.variant.card.slug}`}
            className="underline underline-offset-2"
          >
            {listing.variant.card.name}
          </Link>
        </p>
        <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]">
          <CardImage src={listing.variant.card.imageUrl} alt={listing.variant.card.name} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-medium tracking-tight">{listing.title}</h1>
              <StatusBadge status={listing.status} />
            </div>
            <p className="mt-2 text-text-muted">
              {listing.condition} · {CARD_CONDITION_LABELS[listing.condition]} · {listing.variant.language} ·{" "}
              {listing.variant.finish}
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
                    <img src={image.url} alt="" className="w-full rounded-[12px] border border-border bg-surface-elevated object-contain" />
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-8">
              <AddToCartButton listingId={listing.id} available={listing.available} />
            </div>
            <ReportListingButton listingId={listing.id} />
          </div>
        </div>
        <p className="mt-8 text-sm">
          <Link href="/ayuda" className="underline">
            Ayuda
          </Link>
        </p>
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
