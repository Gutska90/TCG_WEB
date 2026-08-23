import Link from "next/link";
import { CatalogPager } from "../../components/catalog-pager";
import { SearchLayout } from "../../components/search-layout";
import { EmptyState } from "../../components/ui/empty-state";
import { ProductCard } from "../../components/ui/product-card";
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
    <main id="contenido" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-medium tracking-tight">Buscar cartas</h1>
      <p className="mt-2 text-sm text-text-muted">Nombre, número, set o juego.</p>
      <div className="mt-6">
        <SearchLayout games={games} values={values}>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {!hasQuery ? (
            <EmptyState
              title="Empieza a buscar"
              body="Escribe un nombre, número o set para buscar."
            />
          ) : null}
          {results ? (
            <>
              <p className="text-sm text-text-muted">{results.total} resultados</p>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.items.map((card) => (
                  <li key={card.id}>
                    <ProductCard
                      href={`/${card.gameSlug}/${card.setSlug}/${card.slug}`}
                      name={card.name}
                      setName={card.setName}
                      number={card.number}
                      gameName={card.gameName}
                      imageUrl={card.imageUrl}
                      gameSlug={card.gameSlug}
                      meta={card.rarity}
                    />
                  </li>
                ))}
              </ul>
              {results.items.length === 0 ? (
                <EmptyState
                  title="No hay cartas que coincidan."
                  action={
                    <Link href="/ayuda" className="underline">
                      Reportar o pedir ayuda
                    </Link>
                  }
                />
              ) : null}
              <CatalogPager
                page={results.page}
                pageSize={results.pageSize}
                total={results.total}
                hrefForPage={(page) => searchCardsHref({ ...values, page })}
              />
            </>
          ) : null}
        </SearchLayout>
      </div>
    </main>
  );
}
