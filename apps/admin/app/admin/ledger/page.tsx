"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { formatClp, LEDGER_ENTRY_TYPES, LEDGER_ENTRY_TYPE_LABELS } from "@tcg/config";
import type { LedgerEntryView, Paginated } from "@tcg/types";
import { FilterBar, Pager } from "@/components/filters";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [data, setData] = useState<Paginated<LedgerEntryView> | null>(null);

  useEffect(() => {
    void api<Paginated<LedgerEntryView>>(`/v1/admin/ledger${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      const raw = String(value).trim();
      if (!raw) continue;
      if (key === "from" || key === "to") {
        const iso = new Date(raw).toISOString();
        next.set(key, iso);
        continue;
      }
      next.set(key, raw);
    }
    router.push(`/admin/ledger?${next.toString()}`);
  }

  const params = new URLSearchParams(qs);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Ledger</h1>
      <p className="mb-4 text-sm text-neutral-400">Solo lectura. Las correcciones son asientos ADJUSTMENT.</p>
      <FilterBar onSubmit={onSubmit}>
        <label className="flex flex-col gap-1">
          Seller
          <input
            name="sellerId"
            defaultValue={params.get("sellerId") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          Tipo
          <select
            name="entryType"
            defaultValue={params.get("entryType") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">Todos</option>
            {LEDGER_ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {LEDGER_ENTRY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Orden
          <input
            name="orderId"
            defaultValue={params.get("orderId") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          Payment
          <input
            name="paymentId"
            defaultValue={params.get("paymentId") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          Refund
          <input
            name="refundId"
            defaultValue={params.get("refundId") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          Payout
          <input
            name="payoutId"
            defaultValue={params.get("payoutId") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          Desde
          <input
            name="from"
            type="datetime-local"
            defaultValue={params.get("from") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Hasta
          <input
            name="to"
            type="datetime-local"
            defaultValue={params.get("to") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
      </FilterBar>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Fecha</th>
              <th>Tipo</th>
              <th>Monto</th>
              <th>Seller</th>
              <th>Orden</th>
              <th>Payout</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-neutral-800">
                <td className="py-2 text-xs">{row.createdAt}</td>
                <td>{LEDGER_ENTRY_TYPE_LABELS[row.entryType]}</td>
                <td className="tabular-nums">{formatClp(row.amountClp)}</td>
                <td className="font-mono text-xs">
                  {row.sellerId ? (
                    <a href={`/admin/sellers/${row.sellerId}/balance`} className="underline">
                      {row.sellerId.slice(0, 8)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="font-mono text-xs">{row.orderId ? row.orderId.slice(0, 8) : "—"}</td>
                <td className="font-mono text-xs">
                  {row.payoutId ? (
                    <a href={`/admin/payouts/${row.payoutId}`} className="underline">
                      {row.payoutId.slice(0, 8)}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data ? <Pager page={data.page} pageSize={data.pageSize} total={data.total} /> : null}
    </div>
  );
}

export default function AdminLedgerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
