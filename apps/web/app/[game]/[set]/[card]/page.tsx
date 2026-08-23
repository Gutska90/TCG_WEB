import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogRequestError, getCardBySlug } from "../../../../lib/catalog";
import { CardActions } from "../../../../components/card-actions";
import { CardImage } from "../../../../components/ui/product-card";
import { Price } from "../../../../components/ui/price";

export default async function CardPage({
  params,
}: {
  params: Promise<{ game: string; set: string; card: string }>;
}) {
  const { game, set, card } = await params;
  try {
    const detail = await getCardBySlug(game, set, card);
    const defaultVariant = detail.variants.find((row) => row.isDefault) ?? detail.variants[0];
    return (
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-text-muted">
          <Link href={`/${game}`} className="underline underline-offset-2">
            {detail.game.name}
          </Link>
          {" · "}
          <Link href={`/${game}/${set}`} className="underline underline-offset-2">
            {detail.set.name}
          </Link>
        </p>
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr]">
          <CardImage src={detail.imageUrl} alt={detail.name} className="mx-auto w-full max-w-[280px]" />
          <div>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{detail.name}</h1>
            <p className="mt-2 text-text-muted">
              {detail.set.name} · {detail.number} · {detail.rarity}
            </p>
            <p className="mt-1 text-sm text-text-muted">{detail.supertype}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] border border-border bg-surface p-4">
                <p className="text-xs font-medium tracking-wide text-text-muted uppercase">Precio mercado</p>
                <Price value={detail.market.marketPrice} size="lg" className="mt-1" />
              </div>
              <div className="rounded-[16px] border border-border bg-surface p-4">
                <p className="text-xs font-medium tracking-wide text-text-muted uppercase">Menor listing</p>
                <Price value={detail.market.minListing} size="md" className="mt-1" />
                <p className="mt-1 text-xs text-text-muted">
                  No es una venta realizada · {detail.market.activeListings} publicaciones
                </p>
              </div>
            </div>
            {defaultVariant ? (
              <CardActions variantId={defaultVariant.id} variants={detail.variants} />
            ) : null}
          </div>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
