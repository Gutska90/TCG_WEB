"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FavoriteView, Paginated } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";

export default function FavoritesPage() {
  const [data, setData] = useState<Paginated<FavoriteView> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Paginated<FavoriteView>>("/v1/me/favorites")
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          setError("Ingresa para ver favoritos.");
          return;
        }
        setError(err instanceof ApiError ? err.message : "No se pudo cargar");
      });
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12">
        <p>{error}</p>
        <Link href="/ingresar" className="mt-4 inline-block underline">
          Ingresar
        </Link>
      </main>
    );
  }
  if (!data) {
    return <main className="px-6 py-12 text-text-muted">Cargando…</main>;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Favoritos</h1>
      <ul className="mt-8 grid gap-3">
        {data.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/${item.card.gameSlug}/${item.card.setSlug}/${item.card.slug}`}
              className="block rounded-lg border p-4"
            >
              {item.card.name} · {item.variant.language} {item.variant.finish}
            </Link>
          </li>
        ))}
      </ul>
      {data.items.length === 0 ? <p className="mt-6 text-text-muted">Aún no hay favoritos.</p> : null}
    </main>
  );
}
