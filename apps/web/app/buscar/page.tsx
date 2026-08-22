import Link from "next/link";
import { CatalogPager } from "../../components/catalog-pager";
import { SearchForm } from "../../components/search-form";
import { CatalogRequestError, getGames } from "../../lib/catalog";
import { searchCards, searchCardsHref, type SearchCardsInput } from "../../lib/search";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    game?: string;
    set?: string;
    rarity?: string;
    language?: string;
    finish?: string;
    sort?: string;
    priceMin?: string;
    priceMax?: string;
    page?: string;
  }>;
};

function toInput(raw: Awaited<SearchPageProps["searchParams"]>): SearchCardsInput {
  const sort = raw.sort === "releasedAt" || raw.sort === "price" ? raw.sort : "relevance";
  return {
    q: raw.q?.trim() || undefined,
    game: raw.game?.trim() || undefined,
    set: raw.set?.trim() || undefined,
    rarity: raw.rarity?.trim() || undefined,
    language: raw.language?.trim() || undefined,
    finish: raw.finish?.trim() || undefined,
    sort,
    priceMin: raw.priceMin ? Number(raw.priceMin) || undefined : undefined,
    priceMax: raw.priceMax ? Number(raw.priceMax) || undefined : undefined,
    page: Number(raw.page ?? "1") || 1,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const values = toInput(await searchParams);
  let games: Awaited<ReturnType<typeof getGames>> = [];
  try {
    games = await getGames();
  } catch {
    games = [];
  }

  const hasQuery = Boolean(
    values.q || values.game || values.set || values.rarity || values.language || values.finish || values.priceMin || values.priceMax,
  );

  let error: string | null = null;
  let results: Awaited<ReturnType<typeof searchCards>> | null = null;
  if (hasQuery) {
    try {
      results = await searchCards(values);
    } catch (err) {
      if (err instanceof CatalogRequestError && err.status === 400) {
        error = "Revisa los filtros e inténtalo de nuevo.";
      } else {
        error = "No se pudo buscar. ¿Está la API arriba?";
      }
    }
  }

  return (
    <main id="contenido" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold">Buscar cartas</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Nombre, número, set o juego. Los precios de marketplace llegan en una etapa posterior.
      </p>
      <div className="mt-8">
        <SearchForm games={games} values={values} />
      </div>
      {error ? <p className="mt-8 text-sm text-red-700">{error}</p> : null}
      {!hasQuery ? (
        <p className="mt-8 text-neutral-500">Escribe un nombre, número o set para buscar.</p>
      ) : null}
      {results ? (
        <>
          <p className="mt-8 text-sm text-neutral-500">{results.total} resultados</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {results.items.map((card) => (
              <li key={card.id}>
                <Link
                  href={`/${card.gameSlug}/${card.setSlug}/${card.slug}`}
                  className="block rounded-lg border p-4 hover:border-neutral-400"
                >
                  <p className="font-medium">{card.name}</p>
                  <p className="text-sm text-neutral-500">
                    {card.gameName} · {card.setName} · {card.number} · {card.rarity}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {results.items.length === 0 ? (
            <p className="mt-6 text-neutral-600">
              No hay cartas que coincidan.{" "}
              <Link href="/ayuda" className="underline">
                Reportar o pedir ayuda
              </Link>
            </p>
          ) : null}
          <CatalogPager
            page={results.page}
            pageSize={results.pageSize}
            total={results.total}
            hrefForPage={(page) => searchCardsHref({ ...values, page })}
          />
        </>
      ) : null}
    </main>
  );
}
