import { formatClp } from "@tcg/config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogRequestError, getCardBySlug } from "../../../../lib/catalog";
import { CardActions } from "../../../../components/card-actions";

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
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-neutral-500">
          <Link href={`/${game}`} className="underline">
            {detail.game.name}
          </Link>
          {" · "}
          <Link href={`/${game}/${set}`} className="underline">
            {detail.set.name}
          </Link>
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-[200px_1fr]">
          <div className="flex aspect-[63/88] items-center justify-center rounded-lg border bg-neutral-50 text-sm text-neutral-400">
            {detail.imageUrl ? (
              // Origin URL from the catalog source; we do not host publisher art.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
            ) : (
              "Sin imagen"
            )}
          </div>
          <div>
            <h1 className="text-3xl font-semibold">{detail.name}</h1>
            <p className="mt-2 text-neutral-600">
              {detail.set.name} · {detail.number} · {detail.rarity}
            </p>
            <p className="mt-1 text-sm text-neutral-500">{detail.supertype}</p>
            <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-neutral-500">Precio mercado</dt>
              <dd>{detail.market.marketPrice != null ? formatClp(detail.market.marketPrice) : "—"}</dd>
              <dt className="text-neutral-500">Mínimo</dt>
              <dd>{detail.market.minListing != null ? formatClp(detail.market.minListing) : "—"}</dd>
              <dt className="text-neutral-500">Publicaciones</dt>
              <dd>{detail.market.activeListings}</dd>
            </dl>
            {defaultVariant ? (
              <CardActions
                variantId={defaultVariant.id}
                variants={detail.variants}
              />
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
