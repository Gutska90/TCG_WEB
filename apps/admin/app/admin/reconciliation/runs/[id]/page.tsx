"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RECONCILIATION_ISSUE_TYPE_LABELS } from "@tcg/config";
import type { ReconciliationRunDetailView } from "@tcg/types";
import { Meta } from "@/components/confirm-action";
import { ReconIssueStatusBadge, ReconSeverityBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AdminReconRunPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<ReconciliationRunDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<ReconciliationRunDetailView>(`/v1/admin/reconciliation/runs/${id}`)
      .then(setData)
      .catch(() => setError("No se pudo cargar el run"));
  }, [id]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando run…</p>;

  return (
    <div>
      <p className="mb-4 text-sm">
        <Link href="/admin/reconciliation" className="underline">
          Conciliación
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold">Run {data.id.slice(0, 8)}</h1>
      <p className="mb-6 rounded border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
        ESTO NO CORRIGE AUTOMÁTICAMENTE DINERO.
      </p>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Estado">{data.status}</Meta>
        <Meta label="Proveedor">{data.provider}</Meta>
        <Meta label="Payments">{data.checkedPayments}</Meta>
        <Meta label="Refunds">{data.checkedRefunds}</Meta>
        <Meta label="Issues">{data.issuesFound}</Meta>
        <Meta label="Críticos">{data.criticalIssues}</Meta>
        <Meta label="Ventana">
          {data.windowStart ?? "—"} → {data.windowEnd ?? "—"}
        </Meta>
        <Meta label="Provider omitido">{data.providerSkipped ? "sí" : "no"}</Meta>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-neutral-400">
            <th className="py-2 pr-3">Severidad</th>
            <th className="py-2 pr-3">Tipo</th>
            <th className="py-2 pr-3">Esperado</th>
            <th className="py-2 pr-3">Actual</th>
            <th className="py-2 pr-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.issues.map((row) => (
            <tr key={row.id} className="border-b border-neutral-900">
              <td className="py-2 pr-3">
                <ReconSeverityBadge severity={row.severity} />
              </td>
              <td className="py-2 pr-3">
                <Link href={`/admin/reconciliation/issues/${row.id}`} className="underline">
                  {RECONCILIATION_ISSUE_TYPE_LABELS[row.issueType]}
                </Link>
              </td>
              <td className="py-2 pr-3">{row.expectedStatus ?? row.expectedAmountClp ?? "—"}</td>
              <td className="py-2 pr-3">{row.actualStatus ?? row.actualAmountClp ?? "—"}</td>
              <td className="py-2 pr-3">
                <ReconIssueStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
