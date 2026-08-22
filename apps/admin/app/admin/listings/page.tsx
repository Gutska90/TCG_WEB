"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { formatClp, LISTING_STATUSES, LISTING_STATUS_LABELS } from "@tcg/config";
import type { AdminListingListItem, Paginated } from "@tcg/types";
import { FilterBar, Pager, SearchInput } from "@/components/filters";
import { ListingBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [data, setData] = useState<Paginated<AdminListingListItem> | null>(null);

  useEffect(() => {
    void api<Paginated<AdminListingListItem>>(`/v1/admin/listings${qs ? `?${qs}` : ""}`).then(
      setData,
    );
  }, [qs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value)) next.set(key, String(value));
    }
    router.push(`/admin/listings?${next.toString()}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Listings</h1>
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
            {LISTING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LISTING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Título</th>
              <th>Estado</th>
              <th>Seller</th>
              <th>Precio</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-neutral-800">
                <td className="py-2">{row.title}</td>
                <td>
                  <ListingBadge status={row.status} />
                </td>
                <td>{row.seller.email}</td>
                <td className="tabular-nums">{formatClp(row.priceClp)}</td>
                <td className="tabular-nums">
                  {row.quantityReserved}/{row.quantity}
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

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
