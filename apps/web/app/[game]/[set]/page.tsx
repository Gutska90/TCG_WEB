import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogPager } from "../../../components/catalog-pager";
import { SearchFilterChips } from "../../../components/search-form";
import { SearchLayout } from "../../../components/search-layout";
import { EmptyState } from "../../../components/ui/empty-state";
import { CATALOG_CARD_GRID, ProductCard } from "../../../components/ui/product-card";
import { CatalogRequestError, getGameFilters, getSet } from "../../../lib/catalog";
import { searchCards, searchCardsHref, searchInputFromParams, type SearchCardsInput } from "../../../lib/search";

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string; set: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { game, set } = await params;
  const pathname = `/${game}/${set}`;
  const values: SearchCardsInput = {
    ...searchInputFromParams(await searchParams),
    game,
    set,
    pageSize: 40,
  };
  try {
    const setView = await getSet(game, set);
    let filters: Awaited<ReturnType<typeof getGameFilters>> | null = null;
    try {
      filters = await getGameFilters(game);
    } catch {
      filters = null;
    }

    let error: string | null = null;
    let results: Awaited<ReturnType<typeof searchCards>> | null = null;
    try {
      results = await searchCards(values);
    } catch (err) {
      if (err instanceof CatalogRequestError && err.status === 400) {
        error = "Ese filtro no aplica a este juego. Revisa los filtros.";
      } else {
        error = "No se pudo buscar. ¿Está la API arriba?";
      }
    }

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
        <div className="mt-6">
          <SearchLayout
            games={[setView.game]}
            values={values}
            filters={filters}
            action={pathname}
            lockGame
            lockSet
          >
            <div className="mb-4">
              <SearchFilterChips
                values={values}
                pathname={pathname}
                lockedKeys={["game", "set"]}
                games={[setView.game]}
                setLabel={setView.name}
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {results ? (
              <>
                <p className="text-sm text-text-muted">{results.total} resultados</p>
                <ul className={CATALOG_CARD_GRID}>
                  {results.items.map((card) => (
                    <li key={card.id}>
                      <ProductCard
                        href={`/${game}/${set}/${card.slug}`}
                        name={card.name}
                        setName={card.setName}
                        number={card.number}
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
                    title={values.hasListings ? "Nadie vende cartas de esta edición con esos filtros." : "No hay cartas que coincidan."}
                    body={values.hasListings ? "Prueba el catálogo o quita filtros." : undefined}
                    action={
                      <span className="flex flex-wrap justify-center gap-3">
                        {values.hasListings ? (
                          <Link href={searchCardsHref({ ...values, hasListings: undefined, page: 1 }, pathname)} className="underline">
                            Ver catálogo
                          </Link>
                        ) : null}
                        <Link href={pathname} className="underline">
                          Quitar filtros
                        </Link>
                      </span>
                    }
                  />
                ) : null}
                <CatalogPager
                  page={results.page}
                  pageSize={results.pageSize}
                  total={results.total}
                  hrefForPage={(page) => searchCardsHref({ ...values, page }, pathname)}
                />
              </>
            ) : null}
          </SearchLayout>
        </div>
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
