"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import { REPORT_REASONS, REPORT_REASON_LABELS, REPORT_STATUSES, REPORT_STATUS_LABELS } from "@tcg/config";
import type { Paginated, ReportListItem } from "@tcg/types";
import { FilterBar, Pager } from "@/components/filters";
import { ReportBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [data, setData] = useState<Paginated<ReportListItem> | null>(null);

  useEffect(() => {
    void api<Paginated<ReportListItem>>(`/v1/admin/reports${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      if (String(value)) next.set(key, String(value));
    }
    router.push(`/admin/reports?${next.toString()}`);
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Reportes</h1>
      <p className="mb-4 text-sm text-amber-200">Un reporte no suspende ni oculta nada por sí solo.</p>
      <FilterBar onSubmit={onSubmit}>
        <label className="flex flex-col gap-1">
          Estado
          <select name="status" defaultValue={new URLSearchParams(qs).get("status") ?? ""} className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2">
            <option value="">Todos</option>
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {REPORT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Motivo
          <select name="reason" defaultValue={new URLSearchParams(qs).get("reason") ?? ""} className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2">
            <option value="">Todos</option>
            {REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {REPORT_REASON_LABELS[reason]}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>
      <table className="w-full text-left text-sm">
        <thead className="text-neutral-400">
          <tr>
            <th className="py-2">Objetivo</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {(data?.items ?? []).map((row) => (
            <tr key={row.id} className="border-t border-neutral-800">
              <td className="py-2">
                <Link href={`/admin/reports/${row.id}`} className="underline">
                  {row.targetType}
                </Link>
              </td>
              <td>{REPORT_REASON_LABELS[row.reason]}</td>
              <td>
                <ReportBadge status={row.status} />
              </td>
              <td className="text-neutral-400">{row.createdAt.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager page={data?.page ?? 1} pageSize={data?.pageSize ?? 20} total={data?.total ?? 0} />
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
