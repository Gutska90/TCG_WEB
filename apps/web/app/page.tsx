import { PLATFORM } from "@tcg/config";
import Link from "next/link";
import { getGames } from "../lib/catalog";
import { getListings } from "../lib/listings";
import { buttonClassName } from "../components/ui/button-styles";
import { ProductCard } from "../components/ui/product-card";
import { SearchSuggest } from "../components/search-suggest";
import { GameTile } from "../components/game-tile";

const GAME_BLURBS: Record<string, string> = {
  pokemon: "Criaturas y sets para completar.",
  magic: "Singles para armar tu mazo.",
  "one-piece": "Personajes y rares de One Piece.",
  yugioh: "Monstruos, magias y trampas.",
  "mitos-y-leyendas": "El TCG chileno. Aliados y ediciones de vitrina.",
};

export default async function HomePage() {
  let games: Awaited<ReturnType<typeof getGames>> = [];
  try {
    games = await getGames();
  } catch {
    games = [];
  }

  let listings: Awaited<ReturnType<typeof getListings>>["items"] = [];
  try {
    const page = await getListings({ page: 1 });
    listings = page.items.slice(0, 8);
  } catch {
    listings = [];
  }

  return (
    <main id="contenido" className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="rounded-[24px] border border-border bg-surface px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-sm font-medium tracking-wide text-text-muted uppercase">Marketplace Chile</p>
        <h1 className="mt-3 text-4xl font-medium tracking-tight text-text sm:text-5xl">
          Encuentra. Colecciona. Compra. Vende.
        </h1>
        <p className="mt-4 max-w-xl text-base text-text-muted">
          El marketplace de cartas coleccionables para Chile.
        </p>
        <p className="mt-2 max-w-xl text-sm text-text-muted">
          Precios en {PLATFORM.currency}. Envíos cotizados y reputación de vendedores. Esta versión está en prueba.
        </p>
        <form action="/buscar" method="get" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <input type="hidden" name="hasListings" value="true" />
          <label className="sr-only" htmlFor="home-q">
            Buscar cartas en venta
          </label>
          <SearchSuggest id="home-q" name="q" placeholder="Nombre, número o set" />
          <button type="submit" className={buttonClassName("primary", "sm:w-auto")}>
            Buscar
          </button>
        </form>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/buscar?hasListings=true" className={buttonClassName("secondary")}>
            Explorar marketplace
          </Link>
          <Link href="/vender" className={buttonClassName("ghost")}>
            Vender una carta
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-medium tracking-tight">Juegos</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {games.map((game) => (
            <li key={game.id}>
              <GameTile
                href={`/${game.slug}`}
                name={game.name}
                slug={game.slug}
                blurb={GAME_BLURBS[game.slug] ?? game.publisher}
              />
            </li>
          ))}
        </ul>
        {games.length === 0 ? (
          <p className="mt-6 text-sm text-text-muted">Aún no hay juegos publicados.</p>
        ) : null}
      </section>

      {listings.length > 0 ? (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-medium tracking-tight">Publicaciones en el marketplace</h2>
            <Link href="/buscar?hasListings=true" className="text-sm underline underline-offset-2">
              Ver todas
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {listings.map((item) => (
              <li key={item.id}>
                <ProductCard
                  href={`/listings/${item.id}`}
                  name={item.variant.card.name}
                  setName={item.variant.card.setName}
                  number={item.variant.card.number}
                  imageUrl={item.variant.card.imageUrl}
                  priceClp={item.priceClp}
                  gameSlug={item.variant.card.gameSlug}
                  meta={item.variant.card.rarity}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-border bg-surface p-6">
          <h2 className="text-xl font-medium tracking-tight">Tu colección, en un solo lugar.</h2>
          <p className="mt-2 text-sm text-text-muted">
            Registra tus cartas. Conoce su valor. Descubre cuáles te faltan.
          </p>
          <Link href="/me/coleccion" className={buttonClassName("primary", "mt-5")}>
            Ver mi colección
          </Link>
        </div>
        <div className="rounded-[16px] border border-border bg-surface p-6">
          <h2 className="text-xl font-medium tracking-tight">Wishlist con precio objetivo</h2>
          <p className="mt-2 text-sm text-text-muted">
            Guarda cartas que quieres y recibe aviso si aparece una publicación a tu precio.
          </p>
          <Link href="/me/wishlist" className={buttonClassName("secondary", "mt-5")}>
            Ver wishlist
          </Link>
        </div>
      </section>
    </main>
  );
}
