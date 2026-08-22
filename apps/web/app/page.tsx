import { PLATFORM } from "@tcg/config";
import { cx } from "@tcg/ui";
import Link from "next/link";
import { getGames } from "../lib/catalog";

export default async function HomePage() {
  let games: Awaited<ReturnType<typeof getGames>> = [];
  try {
    games = await getGames();
  } catch {
    games = [];
  }

  return (
    <main id="contenido" className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <p className="text-sm tracking-wide text-neutral-500 uppercase">Beta</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">TCG Platform</h1>
      <p className="mt-3 max-w-xl text-neutral-700">
        Catálogo y marketplace en Chile ({PLATFORM.currency}). Envíos cotizados y reputación de vendedores.
      </p>
      <p className="mt-2 max-w-xl text-sm text-neutral-600">
        Esta versión está en prueba. Algunas funciones pueden cambiar.
      </p>
      <form action="/buscar" method="get" className="mt-8 flex max-w-xl gap-2">
        <label className="sr-only" htmlFor="home-q">
          Buscar cartas
        </label>
        <input
          id="home-q"
          name="q"
          type="search"
          placeholder="Nombre, número o set"
          className="w-full rounded border px-3 py-2"
        />
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Buscar
        </button>
      </form>
      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {games.map((game) => (
          <li key={game.id}>
            <Link
              href={`/${game.slug}`}
              className={cx(
                "block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400",
              )}
            >
              <p className="font-medium">{game.name}</p>
              <p className="text-sm text-neutral-500">{game.publisher}</p>
            </Link>
          </li>
        ))}
      </ul>
      {games.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          Aún no hay juegos. Corre <code>pnpm catalog:seed</code> con Postgres arriba.
        </p>
      ) : null}
    </main>
  );
}
