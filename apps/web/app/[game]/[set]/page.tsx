import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogPager } from "../../../components/catalog-pager";
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
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-neutral-500">
          <Link href={`/${game}`} className="underline">
            {setView.game.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{setView.name}</h1>
        <p className="text-neutral-600">
          {setView.code} · {setView.cardCount} cartas
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {cards.items.map((card) => (
            <li key={card.id}>
              <Link
                href={`/${game}/${set}/${card.slug}`}
                className="block rounded-lg border p-4 hover:border-neutral-400"
              >
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
          hrefForPage={(next) => `/${game}/${set}?page=${next}`}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
