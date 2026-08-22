"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { DISPUTE_REASONS, DISPUTE_REASON_LABELS, DISPUTE_STATUSES, DISPUTE_STATUS_LABELS } from "@tcg/config";
import type { DisputeListItem, Paginated } from "@tcg/types";
import { FilterBar, Pager } from "@/components/filters";
import { DisputeBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [data, setData] = useState<Paginated<DisputeListItem> | null>(null);

  useEffect(() => {
    void api<Paginated<DisputeListItem>>(`/v1/admin/disputes${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value)) next.set(key, String(value));
    }
    router.push(`/admin/disputes?${next.toString()}`);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Disputas</h1>
      <p className="mb-4 text-sm text-amber-200">
        Resolver una disputa no mueve dinero. Refund o payout se hacen en las consolas financieras.
      </p>
      <FilterBar onSubmit={onSubmit}>
        <label className="flex flex-col gap-1">
          Estado
          <select name="status" defaultValue={new URLSearchParams(qs).get("status") ?? ""} className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2">
            <option value="">Todos</option>
            {DISPUTE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {DISPUTE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Motivo
          <select name="reason" defaultValue={new URLSearchParams(qs).get("reason") ?? ""} className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2">
            <option value="">Todos</option>
            {DISPUTE_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {DISPUTE_REASON_LABELS[reason]}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      <table className="w-full text-left text-sm">
        <thead className="text-neutral-400">
          <tr>
            <th className="py-2">Orden</th>
            <th>Estado</th>
            <th>Motivo</th>
            <th>Abierta</th>
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((row) => (
            <tr key={row.id} className="border-t border-neutral-800">
              <td className="py-2">
                <Link href={`/admin/disputes/${row.id}`} className="underline">
                  {row.orderNumber}
                </Link>
              </td>
              <td>
                <DisputeBadge status={row.status} />
              </td>
              <td>{DISPUTE_REASON_LABELS[row.reason]}</td>
              <td className="text-neutral-400">{row.openedAt.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={data?.page ?? 1} pageSize={data?.pageSize ?? 20} total={data?.total ?? 0} />
    </div>
  );
}

export default function AdminDisputesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
