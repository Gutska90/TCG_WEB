import Link from "next/link";
import { notFound } from "next/navigation";
import { CARD_CONDITION_LABELS, formatClp, formatReputation } from "@tcg/config";
import { CatalogRequestError } from "../../../lib/catalog";
import { getListing } from "../../../lib/listings";
import { AddToCartButton } from "../../../components/add-to-cart-button";
import { ReportListingButton } from "../../../components/report-listing-button";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const listing = await getListing(id);
    return (
      <main id="contenido" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-sm text-neutral-500">
          <Link href={`/${listing.variant.card.gameSlug}/${listing.variant.card.setSlug}/${listing.variant.card.slug}`} className="underline">
            {listing.variant.card.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{listing.title}</h1>
        <p className="mt-2 text-neutral-600">
          {listing.condition} · {CARD_CONDITION_LABELS[listing.condition]} · {listing.variant.language} · {listing.variant.finish}
        </p>
        <p className="mt-4 text-2xl">{formatClp(listing.priceClp)}</p>
        <p className="mt-2 text-sm text-neutral-600">
          {listing.available} disponible(s) · stock {listing.quantity} ·{" "}
          {listing.allowsMeetup ? "encuentro" : "sin encuentro"} · {listing.allowsShipping ? "envío" : "sin envío"}
        </p>
        <p className="mt-4">
          Vendedor:{" "}
          <Link href={`/vendedores/${listing.seller.slug}`} className="underline">
            {listing.seller.displayName}
          </Link>{" "}
          · {formatReputation(listing.seller.reputation.averageStars, listing.seller.reputation.count)}
        </p>
        {listing.description ? <p className="mt-6 whitespace-pre-wrap">{listing.description}</p> : null}
        <div className="mt-8">
          <AddToCartButton listingId={listing.id} available={listing.available} />
        </div>
        <ReportListingButton listingId={listing.id} />
        <p className="mt-6 text-sm">
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
