"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CATALOG_SUBMISSION_STATUSES, CATALOG_SUBMISSION_STATUS_LABELS } from "@tcg/config";
import type { AdminCatalogSubmissionView, Paginated } from "@tcg/types";
import { api } from "@/lib/api";

export default function AdminCatalogSubmissionsPage() {
  const [status, setStatus] = useState("PENDING");
  const [data, setData] = useState<Paginated<AdminCatalogSubmissionView> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    void api<Paginated<AdminCatalogSubmissionView>>(`/v1/admin/catalog/submissions?${params.toString()}`)
      .then(setData)
      .catch(() => setError("No se pudieron cargar las solicitudes"));
  }, [status]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Solicitudes de catálogo</h1>
      <p className="text-sm text-neutral-400">
        Propuestas de cartas nuevas. Aprobar crea Card + variante default. No aprueba listings.
      </p>
      <label className="text-sm">
        Estado
        <select
          className="ml-2 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Todos</option>
          {CATALOG_SUBMISSION_STATUSES.map((code) => (
            <option key={code} value={code}>
              {CATALOG_SUBMISSION_STATUS_LABELS[code]}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-neutral-400">{data.total} solicitudes</p>
      <ul className="grid gap-3">
        {data.items.map((row) => (
          <li key={row.id} className="rounded border border-neutral-800 p-3 text-sm">
            <Link href={`/admin/catalog/submissions/${row.id}`} className="font-medium underline">
              {row.name}
            </Link>
            <p className="mt-1 text-neutral-400">
              {CATALOG_SUBMISSION_STATUS_LABELS[row.status]} · {row.game.name} · {row.set?.name ?? row.proposedSetName ?? "sin edición"} ·{" "}
              {row.submittedBy.displayName}
            </p>
          </li>
        ))}
      </ul>
      {data.items.length === 0 ? <p className="text-sm text-neutral-400">No hay solicitudes en este filtro.</p> : null}
    </div>
  );
}
