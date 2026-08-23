import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogPager } from "../../../components/catalog-pager";
import { ProductCard } from "../../../components/ui/product-card";
import { CatalogRequestError, getSet, getSetCards } from "../../../lib/catalog";

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string; set: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { game, set } = await params;
  const { page } = await searchParams;
  const current = Number(page ?? "1") || 1;
  try {
    const setView = await getSet(game, set);
    const cards = await getSetCards(setView.id, current);
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-text-muted">
          <Link href={`/${game}`} className="underline underline-offset-2">
            {setView.game.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">{setView.name}</h1>
        <p className="text-text-muted">
          {setView.code} · {setView.cardCount} cartas
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cards.items.map((card) => (
            <li key={card.id}>
              <ProductCard
                href={`/${game}/${set}/${card.slug}`}
                name={card.name}
                number={card.number}
                imageUrl={card.imageUrl}
                gameSlug={card.gameSlug}
                meta={card.rarity}
              />
            </li>
          ))}
        </ul>
        <CatalogPager
          page={cards.page}
          pageSize={cards.pageSize}
          total={cards.total}
          hrefForPage={(next) => `/${game}/${set}?page=${next}`}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
