"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS } from "@tcg/config";
import type { DisputeListItem, Paginated } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";

export default function MyDisputesPage() {
  const router = useRouter();
  const [data, setData] = useState<Paginated<DisputeListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Paginated<DisputeListItem>>("/v1/me/disputes")
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/ingresar");
        else setError(err instanceof ApiError ? err.message : "No se pudo cargar");
      });
  }, [router]);

  if (error) return <main className="px-6 py-12 text-red-700">{error}</main>;
  if (!data) return <main className="px-6 py-12 text-neutral-500">Cargando…</main>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Mis reclamos</h1>
      <p className="mt-2 text-sm">
        <Link href="/ayuda" className="underline">
          Ayuda
        </Link>
      </p>
      <ul className="mt-6 grid gap-3">
        {data.items.map((row) => (
          <li key={row.id}>
            <Link href={`/me/disputas/${row.id}`} className="block rounded border p-4">
              <p className="font-medium">{row.orderNumber}</p>
              <p className="text-sm text-neutral-600">
                {DISPUTE_REASON_LABELS[row.reason]} · {DISPUTE_STATUS_LABELS[row.status]}
              </p>
            </Link>
          </li>
        ))}
        {data.items.length === 0 ? <li className="text-sm text-neutral-500">No tienes reclamos.</li> : null}
      </ul>
    </main>
  );
}
