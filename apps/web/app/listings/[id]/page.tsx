import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogRequestError } from "../../../lib/catalog";
import { getListing } from "../../../lib/listings";
import { ListingDetailPurchase } from "../../../components/listing-detail-purchase";

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
        <ListingDetailPurchase listing={listing} />
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
