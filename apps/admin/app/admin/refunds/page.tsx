"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { formatClp, REFUND_STATUSES, REFUND_STATUS_LABELS } from "@tcg/config";
import type { AdminRefundListItem, Paginated } from "@tcg/types";
import { FilterBar, Pager, SearchInput } from "@/components/filters";
import { RefundBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [data, setData] = useState<Paginated<AdminRefundListItem> | null>(null);

  useEffect(() => {
    void api<Paginated<AdminRefundListItem>>(`/v1/admin/refunds${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value)) next.set(key, String(value));
    }
    router.push(`/admin/refunds?${next.toString()}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Refunds</h1>
      <FilterBar onSubmit={onSubmit}>
        <SearchInput />
        <label className="flex flex-col gap-1">
          Estado
          <select
            name="status"
            defaultValue={new URLSearchParams(qs).get("status") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">Todos</option>
            {REFUND_STATUSES.map((status) => (
              <option key={status} value={status}>
                {REFUND_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Orden</th>
              <th>Estado</th>
              <th>Monto</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-neutral-800">
                <td className="py-2 font-mono text-xs">
                  <a href={`/admin/refunds/${row.id}`} className="underline">
                    {row.orderNumber}
                  </a>
                </td>
                <td>
                  <RefundBadge status={row.status} />
                </td>
                <td className="tabular-nums">{formatClp(row.amountClp)}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data ? <Pager page={data.page} pageSize={data.pageSize} total={data.total} /> : null}
    </div>
  );
}

export default function AdminRefundsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
