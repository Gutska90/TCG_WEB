import Link from "next/link";
import { CatalogPager } from "../../components/catalog-pager";
import { SearchFilterChips } from "../../components/search-form";
import { SearchLayout } from "../../components/search-layout";
import { EmptyState } from "../../components/ui/empty-state";
import { CATALOG_CARD_GRID, ProductCard } from "../../components/ui/product-card";
import { CatalogRequestError, getGameFilters, getGames } from "../../lib/catalog";
import { searchCards, searchCardsHref, searchInputFromParams } from "../../lib/search";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const values = searchInputFromParams(await searchParams);
  let games: Awaited<ReturnType<typeof getGames>> = [];
  try {
    games = await getGames();
  } catch {
    games = [];
  }

  let filters: Awaited<ReturnType<typeof getGameFilters>> | null = null;
  if (values.game) {
    try {
      filters = await getGameFilters(values.game);
    } catch {
      filters = null;
    }
  }

  const hasQuery = Boolean(
    values.q ||
      values.game ||
      values.set ||
      values.rarity ||
      values.supertype ||
      values.language ||
      values.finish ||
      values.condition ||
      values.hasListings ||
      values.priceMin ||
      values.priceMax ||
      (values.attrs && Object.keys(values.attrs).length > 0),
  );

  let error: string | null = null;
  let results: Awaited<ReturnType<typeof searchCards>> | null = null;
  if (hasQuery) {
    try {
      results = await searchCards(values);
    } catch (err) {
      if (err instanceof CatalogRequestError && err.status === 400) {
        error = "Ese filtro no aplica a este juego. Revisa los filtros.";
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
        <SearchLayout games={games} values={values} filters={filters}>
          <div className="mb-4">
            <SearchFilterChips values={values} games={games} />
          </div>
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
              <ul className={CATALOG_CARD_GRID}>
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
                      priceClp={card.minListingClp}
                    />
                  </li>
                ))}
              </ul>
              {results.items.length === 0 ? (
                <EmptyState
                  title={values.hasListings ? "Nadie vende cartas con esos filtros." : "No hay cartas que coincidan."}
                  body={
                    values.hasListings
                      ? "Prueba el catálogo o quita filtros. Si buscas una carta concreta, agrégala a tu wishlist."
                      : "Prueba otro nombre, quita filtros o mira el marketplace."
                  }
                  action={
                    <span className="flex flex-wrap justify-center gap-3">
                      <Link href={searchCardsHref({ ...values, hasListings: undefined, page: 1 })} className="underline">
                        Ver catálogo
                      </Link>
                      {values.hasListings ? null : (
                        <Link href={searchCardsHref({ ...values, hasListings: true, page: 1 })} className="underline">
                          Ver en venta
                        </Link>
                      )}
                      <Link href="/me/wishlist" className="underline">
                        Ir a wishlist
                      </Link>
                    </span>
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
