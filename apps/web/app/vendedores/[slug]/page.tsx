import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CARD_CONDITION_LABELS,
  CARD_CONDITIONS,
  CARD_FINISHES,
  CARD_LANGUAGES,
  formatReputation,
} from "@tcg/config";
import { CatalogRequestError, catalogGet, getGames, getSets } from "../../../lib/catalog";
import { getListings, sellerStoreHref, type PublicListingsQuery } from "../../../lib/listings";
import { CatalogPager } from "../../../components/catalog-pager";
import { EmptyState } from "../../../components/ui/empty-state";
import { ListingOfferCard } from "../../../components/listing-offer-card";
import { SearchInput } from "../../../components/ui/search-input";
import { Select } from "../../../components/ui/input";
import { buttonClassName } from "../../../components/ui/button-styles";
import { ShareControls } from "../../../components/share-controls";
import { WhatsappStoreButton } from "../../../components/whatsapp-store-button";
import type { PublicUserView, SellerRatingsPageView } from "@tcg/types";

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function inventoryLabel(count: number): string {
  return count === 1 ? "1 carta disponible" : `${count} cartas disponibles`;
}

function salesLabel(count: number): string {
  return count === 1 ? "1 venta" : `${count} ventas`;
}

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const raw = await searchParams;
  const tab = first(raw.tab) === "valoraciones" || first(raw.tab) === "informacion" ? first(raw.tab)! : "productos";
  const q = first(raw.q)?.trim() || undefined;
  const game = first(raw.game)?.trim() || undefined;
  const set = first(raw.set)?.trim() || undefined;
  const condition = first(raw.condition)?.trim() || undefined;
  const language = first(raw.language)?.trim() || undefined;
  const finish = first(raw.finish)?.trim() || undefined;
  const cardType = first(raw.cardType)?.trim() || undefined;
  const raza = first(raw.raza)?.trim() || undefined;
  const minPrice = Number(first(raw.minPrice) ?? "") || undefined;
  const maxPrice = Number(first(raw.maxPrice) ?? "") || undefined;
  const coste = first(raw.coste) ? Number(first(raw.coste)) : undefined;
  const sortRaw = first(raw.sort);
  const sort: PublicListingsQuery["sort"] =
    sortRaw === "priceDesc" || sortRaw === "newest" || sortRaw === "nameAsc" || sortRaw === "relevance"
      ? sortRaw
      : "priceAsc";
  const page = Math.max(1, Number(first(raw.page) ?? "1") || 1);
  const filters = { q, game, set, condition, language, finish, cardType, raza, minPrice, maxPrice, coste, sort };

  try {
    const seller = await catalogGet<PublicUserView>(`/v1/users/${slug}`, false);
    const [listings, ratings, games] = await Promise.all([
      getListings({
        sellerId: seller.id,
        ...filters,
        page,
        pageSize: 24,
      }),
      catalogGet<SellerRatingsPageView>(`/v1/users/${seller.id}/ratings?pageSize=8`, false),
      getGames().catch(() => []),
    ]);
    const sets = game ? await getSets(game).catch(() => []) : [];
    const location = [seller.profile.comuna, seller.profile.region].filter(Boolean).join(" · ") || "Chile";
    const isMyl = game === "mitos-y-leyendas";

    return (
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-[24px] border border-border bg-surface px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-sm text-text-muted">Vendedor</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight">{seller.displayName}</h1>
          <p className="mt-2 text-sm text-text-muted">
            {location} · miembro desde {new Date(seller.createdAt).getFullYear()}
          </p>
          <p className="mt-3 text-sm">
            {formatReputation(seller.reputation.averageStars, seller.reputation.count)} · {salesLabel(seller.completedSaleCount)} ·{" "}
            {inventoryLabel(seller.activeListingCount)}
          </p>
          {seller.profile.bio ? <p className="mt-4 max-w-2xl text-sm text-text-muted">{seller.profile.bio}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {seller.contactWhatsappEnabled && seller.contactWhatsapp ? (
              <WhatsappStoreButton phoneE164={seller.contactWhatsapp} storeName={seller.displayName} />
            ) : null}
            <ShareControls path={`/vendedores/${slug}`} title={seller.displayName} />
          </div>
        </section>

        <nav className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href={sellerStoreHref(slug, { ...filters, tab: "productos" })} className={tab === "productos" ? "font-medium" : "text-text-muted underline"}>
            Productos
          </Link>
          <Link href={sellerStoreHref(slug, { tab: "valoraciones" })} className={tab === "valoraciones" ? "font-medium" : "text-text-muted underline"}>
            Valoraciones
          </Link>
          <Link href={sellerStoreHref(slug, { tab: "informacion" })} className={tab === "informacion" ? "font-medium" : "text-text-muted underline"}>
            Información
          </Link>
        </nav>

        {tab === "productos" ? (
          <section id="inventario" className="mt-8">
            <h2 className="text-2xl font-medium tracking-tight">{inventoryLabel(seller.activeListingCount)}</h2>
            <form method="get" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="tab" value="productos" />
              <div className="sm:col-span-2">
                <label className="sr-only" htmlFor="seller-q">
                  Buscar en esta tienda
                </label>
                <SearchInput id="seller-q" name="q" defaultValue={q ?? ""} placeholder="Buscar en esta tienda" />
              </div>
              <Select name="game" defaultValue={game ?? ""} aria-label="Juego">
                <option value="">Todos los juegos</option>
                {games.map((row) => (
                  <option key={row.id} value={row.slug}>
                    {row.name}
                  </option>
                ))}
              </Select>
              <Select name="set" defaultValue={set ?? ""} aria-label="Edición" disabled={!game}>
                <option value="">Todas las ediciones</option>
                {sets.map((row) => (
                  <option key={row.id} value={row.slug}>
                    {row.name}
                  </option>
                ))}
              </Select>
              <Select name="condition" defaultValue={condition ?? ""} aria-label="Condición">
                <option value="">Cualquier condición</option>
                {CARD_CONDITIONS.map((code) => (
                  <option key={code} value={code}>
                    {CARD_CONDITION_LABELS[code]}
                  </option>
                ))}
              </Select>
              <Select name="language" defaultValue={language ?? ""} aria-label="Idioma">
                <option value="">Cualquier idioma</option>
                {CARD_LANGUAGES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
              <Select name="finish" defaultValue={finish ?? ""} aria-label="Finish">
                <option value="">Cualquier finish</option>
                {CARD_FINISHES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
              <label className="text-sm">
                Precio mín.
                <input className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" type="number" name="minPrice" defaultValue={minPrice ?? ""} min={1} />
              </label>
              <label className="text-sm">
                Precio máx.
                <input className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" type="number" name="maxPrice" defaultValue={maxPrice ?? ""} min={1} />
              </label>
              {isMyl || !game ? (
                <>
                  <label className="text-sm">
                    Tipo MyL
                    <input className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" name="cardType" defaultValue={cardType ?? ""} />
                  </label>
                  <label className="text-sm">
                    Raza
                    <input className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" name="raza" defaultValue={raza ?? ""} />
                  </label>
                  <label className="text-sm">
                    Coste
                    <input className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" type="number" name="coste" defaultValue={coste ?? ""} min={0} />
                  </label>
                </>
              ) : null}
              <Select name="sort" defaultValue={sort} aria-label="Ordenar">
                <option value="relevance">Más relevante</option>
                <option value="priceAsc">Precio menor</option>
                <option value="priceDesc">Precio mayor</option>
                <option value="newest">Más reciente</option>
                <option value="nameAsc">Nombre A-Z</option>
              </Select>
              <button type="submit" className={buttonClassName("secondary")}>
                Filtrar
              </button>
            </form>

            <p className="mt-4 text-sm text-text-muted">{listings.total} publicaciones</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {listings.items.map((item) => (
                <li key={item.id}>
                  <ListingOfferCard item={item} />
                </li>
              ))}
            </ul>
            {listings.items.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No hay cartas que coincidan."
                  body="Prueba otro nombre, edición o condición."
                  action={
                    q || game || set || condition ? (
                      <Link href={sellerStoreHref(slug, {})} className="underline">
                        Quitar filtros
                      </Link>
                    ) : undefined
                  }
                />
              </div>
            ) : null}
            <CatalogPager
              page={listings.page}
              pageSize={listings.pageSize}
              total={listings.total}
              hrefForPage={(next) => sellerStoreHref(slug, { ...filters, tab: "productos", page: next })}
            />
          </section>
        ) : null}

        {tab === "valoraciones" ? (
          <section className="mt-8">
            <h2 className="text-2xl font-medium tracking-tight">Valoraciones</h2>
            <ul className="mt-4 grid gap-3">
              {ratings.items.map((row) => (
                <li key={row.id} className="rounded-[16px] border border-border bg-surface p-4 text-sm">
                  <p className="font-medium">
                    {row.stars} ★ · {row.from.displayName}
                  </p>
                  {row.comment ? <p className="mt-1 text-text-muted">{row.comment}</p> : null}
                </li>
              ))}
            </ul>
            {ratings.items.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">Aún no hay valoraciones públicas.</p>
            ) : null}
          </section>
        ) : null}

        {tab === "informacion" ? (
          <section className="mt-8 rounded-[16px] border border-border bg-surface p-5 text-sm">
            <h2 className="text-2xl font-medium tracking-tight">Información</h2>
            <p className="mt-3">{location}</p>
            <p className="mt-2 text-text-muted">{seller.profile.bio || "Este vendedor aún no agregó una descripción."}</p>
            <p className="mt-4 text-text-muted">
              El checkout de TCG Market Chile sigue siendo la forma principal de compra. El contacto es opcional.
            </p>
          </section>
        ) : null}
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
