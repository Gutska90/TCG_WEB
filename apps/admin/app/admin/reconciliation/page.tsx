"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type FormEvent, useEffect, useState } from "react";
import {
  RECONCILIATION_ISSUE_STATUSES,
  RECONCILIATION_ISSUE_STATUS_LABELS,
  RECONCILIATION_ISSUE_TYPES,
  RECONCILIATION_ISSUE_TYPE_LABELS,
  RECONCILIATION_SEVERITIES,
  RECONCILIATION_SEVERITY_LABELS,
} from "@tcg/config";
import type {
  Paginated,
  ReconciliationDashboardView,
  ReconciliationIssueView,
  ReconciliationRunView,
} from "@tcg/types";
import { FilterBar, Pager } from "@/components/filters";
import { KpiCard } from "@/components/kpi-card";
import { ReconIssueStatusBadge, ReconSeverityBadge } from "@/components/status-badge";
import { ApiError, api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const router = useRouter();
  const [dash, setDash] = useState<ReconciliationDashboardView | null>(null);
  const [data, setData] = useState<Paginated<ReconciliationIssueView> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api<ReconciliationDashboardView>("/v1/admin/reconciliation").then(setDash);
  }, []);

  useEffect(() => {
    void api<Paginated<ReconciliationIssueView>>(`/v1/admin/reconciliation/issues${qs ? `?${qs}` : ""}`).then(
      setData,
    );
  }, [qs]);

  function onFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const [key, value] of form.entries()) {
      const raw = String(value).trim();
      if (!raw) continue;
      if (key === "from" || key === "to") {
        next.set(key, new Date(raw).toISOString());
        continue;
      }
      next.set(key, raw);
    }
    router.push(`/admin/reconciliation?${next.toString()}`);
  }

  async function onRun() {
    setPending(true);
    setError(null);
    try {
      const run = await api<ReconciliationRunView>("/v1/admin/reconciliation/run", {
        method: "POST",
        body: JSON.stringify({ hours: 48 }),
      });
      router.push(`/admin/reconciliation/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ejecutar la conciliación");
    } finally {
      setPending(false);
    }
  }

  const params = new URLSearchParams(qs);
  const last = dash?.lastRun;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Conciliación</h1>
      <p className="mb-4 rounded border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
        ESTO NO CORRIGE AUTOMÁTICAMENTE DINERO. Solo compara Postgres con el proveedor y abre issues.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Última conciliación"
          value={last ? last.status : "—"}
          hint={last ? new Date(last.startedAt).toLocaleString("es-CL") : "Sin runs"}
        />
        <KpiCard label="Payments revisados" value={String(last?.checkedPayments ?? 0)} />
        <KpiCard label="Refunds revisados" value={String(last?.checkedRefunds ?? 0)} />
        <KpiCard label="Issues abiertos" value={String(dash?.openIssues ?? 0)} />
        <KpiCard label="Critical abiertos" value={String(dash?.openCritical ?? 0)} />
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => void onRun()}
        className="mb-6 rounded bg-white px-3 py-2 text-sm text-neutral-950 disabled:opacity-50"
      >
        {pending ? "Ejecutando…" : "Ejecutar conciliación"}
      </button>
      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      <FilterBar onSubmit={onFilter}>
        <label className="flex flex-col gap-1">
          Severidad
          <select
            name="severity"
            defaultValue={params.get("severity") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">Todas</option>
            {RECONCILIATION_SEVERITIES.map((value) => (
              <option key={value} value={value}>
                {RECONCILIATION_SEVERITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Tipo
          <select
            name="issueType"
            defaultValue={params.get("issueType") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">Todos</option>
            {RECONCILIATION_ISSUE_TYPES.map((value) => (
              <option key={value} value={value}>
                {RECONCILIATION_ISSUE_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Estado
          <select
            name="status"
            defaultValue={params.get("status") ?? ""}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          >
            <option value="">Todos</option>
            {RECONCILIATION_ISSUE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {RECONCILIATION_ISSUE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Desde
          <input
            type="datetime-local"
            name="from"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Hasta
          <input
            type="datetime-local"
            name="to"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
      </FilterBar>

      {!data ? (
        <p className="text-sm text-neutral-400">Cargando issues…</p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-neutral-500">Sin issues en este filtro.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400">
              <th className="py-2 pr-3">Severidad</th>
              <th className="py-2 pr-3">Tipo</th>
              <th className="py-2 pr-3">Entidad</th>
              <th className="py-2 pr-3">Esperado</th>
              <th className="py-2 pr-3">Actual</th>
              <th className="py-2 pr-3">Creado</th>
              <th className="py-2 pr-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((row) => (
              <tr key={row.id} className="border-b border-neutral-900">
                <td className="py-2 pr-3">
                  <ReconSeverityBadge severity={row.severity} />
                </td>
                <td className="py-2 pr-3">
                  <Link href={`/admin/reconciliation/issues/${row.id}`} className="underline">
                    {RECONCILIATION_ISSUE_TYPE_LABELS[row.issueType]}
                  </Link>
                </td>
                <td className="py-2 pr-3 font-mono text-xs">
                  {row.entityType} {row.entityId ?? row.providerPaymentId ?? "—"}
                </td>
                <td className="py-2 pr-3">
                  {row.expectedStatus ?? "—"}
                  {row.expectedAmountClp != null ? ` · ${row.expectedAmountClp}` : ""}
                </td>
                <td className="py-2 pr-3">
                  {row.actualStatus ?? "—"}
                  {row.actualAmountClp != null ? ` · ${row.actualAmountClp}` : ""}
                </td>
                <td className="py-2 pr-3">{new Date(row.createdAt).toLocaleString("es-CL")}</td>
                <td className="py-2 pr-3">
                  <ReconIssueStatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data ? <Pager page={data.page} pageSize={data.pageSize} total={data.total} /> : null}
    </div>
  );
}

export default function AdminReconciliationPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
