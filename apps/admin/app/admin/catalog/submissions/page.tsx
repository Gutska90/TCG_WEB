"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CATALOG_SUBMISSION_STATUSES, CATALOG_SUBMISSION_STATUS_LABELS } from "@tcg/config";
import type { AdminCatalogSubmissionView, Paginated } from "@tcg/types";
import { Pager } from "@/components/filters";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const router = useRouter();
  const qs = search?.toString() ?? "";
  const params = new URLSearchParams(qs);
  const status = params.get("status") ?? "PENDING";
  const [data, setData] = useState<Paginated<AdminCatalogSubmissionView> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(qs);
    const rawStatus = query.get("status");
    if (rawStatus === null) query.set("status", "PENDING");
    if (rawStatus === "") query.delete("status");
    void api<Paginated<AdminCatalogSubmissionView>>(`/v1/admin/catalog/submissions?${query.toString()}`)
      .then(setData)
      .catch(() => setError("No se pudieron cargar las solicitudes"));
  }, [qs]);

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
          onChange={(event) => {
            const next = new URLSearchParams(qs);
            next.set("status", event.target.value);
            next.delete("page");
            router.push(`/admin/catalog/submissions?${next.toString()}`);
          }}
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
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} />
    </div>
  );
}

export default function AdminCatalogSubmissionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
