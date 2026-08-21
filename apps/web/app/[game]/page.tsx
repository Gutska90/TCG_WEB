import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogRequestError, getGame, getSets } from "../../lib/catalog";

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game: slug } = await params;
  try {
    const [game, sets] = await Promise.all([getGame(slug), getSets(slug)]);
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-neutral-500">
          <Link href="/" className="underline">
            Juegos
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{game.name}</h1>
        <p className="text-neutral-600">{game.publisher}</p>
        <p className="mt-4 text-sm">
          <Link href={`/${game.slug}/cartas`} className="underline">
            Ver todas las cartas
          </Link>
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {sets.map((set) => (
            <li key={set.id}>
              <Link href={`/${game.slug}/${set.slug}`} className="block rounded-lg border p-4 hover:border-neutral-400">
                <p className="font-medium">{set.name}</p>
                <p className="text-sm text-neutral-500">
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
