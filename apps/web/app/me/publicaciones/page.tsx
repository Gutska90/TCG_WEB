"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { ListingView, Paginated } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";

export default function MyListingsPage() {
  const router = useRouter();
  const [data, setData] = useState<Paginated<ListingView> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<Paginated<ListingView>>("/v1/me/listings")
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/ingresar");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/me/vendedor");
          return;
        }
        setError(err instanceof ApiError ? err.message : "No se pudo cargar");
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function act(id: string, action: "pause" | "activate" | "delete") {
    if (action === "delete") {
      await api(`/v1/listings/${id}`, { method: "DELETE" });
    } else {
      await api(`/v1/listings/${id}/${action}`, { method: "POST" });
    }
    load();
  }

  if (error) return <main className="px-6 py-12 text-red-700">{error}</main>;
  if (!data) return <main className="px-6 py-12 text-neutral-500">Cargando…</main>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Mis publicaciones</h1>
      <ul className="mt-8 grid gap-3">
        {data.items.map((item) => (
          <li key={item.id} className="rounded border p-4">
            <Link href={`/listings/${item.id}`} className="font-medium underline">
              {item.title}
            </Link>
            <p className="text-sm text-neutral-600">
              {item.status} · {formatClp(item.priceClp)} · qty {item.quantity}
            </p>
            <div className="mt-3 flex gap-2 text-sm">
              {item.status === "ACTIVE" ? (
                <button type="button" className="rounded border px-3 py-1" onClick={() => void act(item.id, "pause")}>
                  Pausar
                </button>
              ) : null}
              {item.status === "PAUSED" ? (
                <button type="button" className="rounded border px-3 py-1" onClick={() => void act(item.id, "activate")}>
                  Activar
                </button>
              ) : null}
              <button type="button" className="rounded border px-3 py-1" onClick={() => void act(item.id, "delete")}>
                Cancelar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {data.items.length === 0 ? <p className="mt-6 text-neutral-500">Aún no publicas.</p> : null}
    </main>
  );
}
