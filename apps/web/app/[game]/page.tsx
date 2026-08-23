import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogRequestError, getGame, getSets } from "../../lib/catalog";

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game: slug } = await params;
  try {
    const [game, sets] = await Promise.all([getGame(slug), getSets(slug)]);
    return (
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-sm text-text-muted">
          <Link href="/" className="underline underline-offset-2">
            Juegos
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">{game.name}</h1>
        <p className="text-text-muted">{game.publisher}</p>
        <p className="mt-4 text-sm">
          <Link href={`/${game.slug}/cartas`} className="underline underline-offset-2">
            Ver todas las cartas
          </Link>
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((set) => (
            <li key={set.id}>
              <Link href={`/${game.slug}/${set.slug}`} className="elevate-hover block rounded-[16px] border border-border bg-surface p-4">
                <p className="font-medium">{set.name}</p>
                <p className="text-sm text-text-muted">
                  {set.code} · {set.cardCount} cartas
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    );
  } catch (error) {
    if (error instanceof CatalogRequestError && error.status === 404) notFound();
    throw error;
  }
}
