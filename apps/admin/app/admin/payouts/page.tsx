"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { formatClp, PAYOUT_STATUSES, PAYOUT_STATUS_LABELS } from "@tcg/config";
import type { AdminPayoutListItem, Paginated } from "@tcg/types";
import { FilterBar, Pager } from "@/components/filters";
import { PayoutBadge } from "@/components/status-badge";
import { ApiError, api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [data, setData] = useState<Paginated<AdminPayoutListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api<Paginated<AdminPayoutListItem>>(`/v1/admin/payouts${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  function onFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value)) next.set(key, String(value));
    }
    router.push(`/admin/payouts?${next.toString()}`);
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sellerId = String(form.get("sellerId") ?? "").trim();
    const rawOrders = String(form.get("orderIds") ?? "").trim();
    const orderIds = rawOrders
      ? rawOrders
          .split(/[\s,]+/)
          .map((id) => id.trim())
          .filter(Boolean)
      : undefined;
    setPending(true);
    setError(null);
    try {
      const created = await api<AdminPayoutListItem>("/v1/admin/payouts", {
        method: "POST",
        body: JSON.stringify({ sellerId, ...(orderIds ? { orderIds } : {}) }),
      });
      router.push(`/admin/payouts/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el payout");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Payouts</h1>
      <p className="mb-4 text-sm text-neutral-400">
        Manual. El monto y la comisión se calculan en el servidor. No hay transferencia bancaria en esta fase.
      </p>
      <form onSubmit={onCreate} className="mb-6 grid gap-3 rounded border border-neutral-800 p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Seller ID
          <input
            name="sellerId"
            required
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Order IDs (opcional)
          <input
            name="orderIds"
            placeholder="uuid, uuid"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        {error ? <p className="text-sm text-red-400 sm:col-span-2">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-white px-3 py-2 text-sm text-neutral-950 disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear payout"}
        </button>
      </form>
      <FilterBar onSubmit={onFilter}>
        <label className="flex flex-col gap-1">
          Seller ID
          <input
            name="sellerId"
            defaultValue={new URLSearchParams(qs).get("sellerId") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          Estado
          <select
            name="status"
            defaultValue={new URLSearchParams(qs).get("status") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">Todos</option>
            {PAYOUT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYOUT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Seller</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Órdenes</th>
              <th>providerRef</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-neutral-800">
                <td className="py-2">
                  <a href={`/admin/payouts/${row.id}`} className="underline">
                    {row.seller.displayName}
                  </a>
                  <span className="block font-mono text-xs text-neutral-500">{row.seller.email}</span>
                </td>
                <td className="tabular-nums">{formatClp(row.amountClp)}</td>
                <td>
                  <PayoutBadge status={row.status} />
                </td>
                <td>{row.orderCount}</td>
                <td className="font-mono text-xs">{row.providerRef ?? "—"}</td>
                <td className="text-xs text-neutral-400">{row.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data ? <Pager page={data.page} pageSize={data.pageSize} total={data.total} /> : null}
    </div>
  );
}

export default function AdminPayoutsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
