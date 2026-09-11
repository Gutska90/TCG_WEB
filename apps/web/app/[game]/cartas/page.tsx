import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogPager } from "../../../components/catalog-pager";
import { SearchFilterChips } from "../../../components/search-form";
import { SearchLayout } from "../../../components/search-layout";
import { EmptyState } from "../../../components/ui/empty-state";
import { CATALOG_CARD_GRID, ProductCard } from "../../../components/ui/product-card";
import { CatalogRequestError, getGame, getGameFilters } from "../../../lib/catalog";
import { searchCards, searchCardsHref, searchInputFromParams, type SearchCardsInput, hasExtraSearchFilters } from "../../../lib/search";

export default async function GameCardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { game: slug } = await params;
  const pathname = `/${slug}/cartas`;
  const values: SearchCardsInput = {
    ...searchInputFromParams(await searchParams),
    game: slug,
    pageSize: 40,
  };
  try {
    const game = await getGame(slug);
    let filters: Awaited<ReturnType<typeof getGameFilters>> | null = null;
    try {
      filters = await getGameFilters(slug);
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
        <Link href={`/${game.slug}`} className="text-sm underline underline-offset-2">
          {game.name}
        </Link>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Cartas</h1>
        <div className="mt-6">
          <SearchLayout games={[game]} values={values} filters={filters} action={pathname} lockGame>
            <div className="mb-4">
              <SearchFilterChips values={values} pathname={pathname} lockedKeys={["game"]} games={[game]} />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
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
                    title={
                      values.hasListings
                        ? "Nadie vende cartas con esos filtros."
                        : hasExtraSearchFilters(values, ["game"])
                          ? "No hay cartas que coincidan."
                          : `El catálogo de ${game.name} está en preparación.`
                    }
                    body={
                      values.hasListings
                        ? "Prueba el catálogo o quita filtros."
                        : hasExtraSearchFilters(values, ["game"])
                          ? "Prueba otro nombre o quita filtros."
                          : "Aún no publicamos cartas verificadas de este juego."
                    }
                    action={
                      values.hasListings ? (
                        <Link href={searchCardsHref({ ...values, hasListings: undefined, page: 1 }, pathname)} className="underline">
                          Ver catálogo
                        </Link>
                      ) : hasExtraSearchFilters(values, ["game"]) ? (
                        <Link href={pathname} className="underline">
                          Quitar filtros
                        </Link>
                      ) : (
                        <Link href={`/${game.slug}`} className="underline">
                          Volver al juego
                        </Link>
                      )
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
