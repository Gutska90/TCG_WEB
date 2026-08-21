import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogPager } from "../../../components/catalog-pager";
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
      <main className="mx-auto max-w-5xl px-6 py-12">
        <Link href={`/${game.slug}`} className="text-sm underline">
          {game.name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Cartas</h1>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {cards.items.map((card) => (
            <li key={card.id}>
              <Link href={`/${card.gameSlug}/${card.setSlug}/${card.slug}`} className="block rounded-lg border p-4">
                <p className="font-medium">{card.name}</p>
                <p className="text-sm text-neutral-500">
                  {card.number} · {card.rarity}
                </p>
              </Link>
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
