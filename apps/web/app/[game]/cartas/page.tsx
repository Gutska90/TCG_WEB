import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogPager } from "../../../components/catalog-pager";
import { ProductCard } from "../../../components/ui/product-card";
import { CatalogRequestError, getGame, getGameCards } from "../../../lib/catalog";

export default async function GameCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { game: slug } = await params;
  const { page } = await searchParams;
  const current = Number(page ?? "1") || 1;
  try {
    const [game, cards] = await Promise.all([getGame(slug), getGameCards(slug, current)]);
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Link href={`/${game.slug}`} className="text-sm underline underline-offset-2">
          {game.name}
        </Link>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Cartas</h1>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {cards.items.map((card) => (
            <li key={card.id}>
              <ProductCard
                href={`/${card.gameSlug}/${card.setSlug}/${card.slug}`}
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
          hrefForPage={(next) => `/${game.slug}/cartas?page=${next}`}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
