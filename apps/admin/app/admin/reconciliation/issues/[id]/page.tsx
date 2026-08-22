"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RECONCILIATION_ISSUE_TYPE_LABELS } from "@tcg/config";
import type { ReconciliationIssueView } from "@tcg/types";
import { ConfirmAction, Meta } from "@/components/confirm-action";
import { ReconIssueStatusBadge, ReconSeverityBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AdminReconIssuePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [data, setData] = useState<ReconciliationIssueView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api<ReconciliationIssueView>(`/v1/admin/reconciliation/issues/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError("No se pudo cargar el issue"));
  }, [load]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando issue…</p>;

  const closed = data.status === "RESOLVED" || data.status === "IGNORED";

  return (
    <div>
      <p className="mb-4 text-sm">
        <Link href="/admin/reconciliation" className="underline">
          Conciliación
        </Link>
        {" · "}
        <Link href={`/admin/reconciliation/runs/${data.runId}`} className="underline">
          Run
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold">{RECONCILIATION_ISSUE_TYPE_LABELS[data.issueType]}</h1>
      <p className="mb-6 rounded border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
        ESTO NO CORRIGE AUTOMÁTICAMENTE DINERO. Resolver no cambia Payment, Refund ni ledger.
      </p>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Meta label="Severidad">
          <ReconSeverityBadge severity={data.severity} />
        </Meta>
        <Meta label="Estado">
          <ReconIssueStatusBadge status={data.status} />
        </Meta>
        <Meta label="Entidad">
          {data.entityType} {data.entityId ?? "—"}
        </Meta>
        <Meta label="Pago proveedor">{data.providerPaymentId ?? "—"}</Meta>
        <Meta label="Refund proveedor">{data.providerRefundId ?? "—"}</Meta>
        <Meta label="Esperado">
          {data.expectedStatus ?? "—"} {data.expectedAmountClp ?? ""}
        </Meta>
        <Meta label="Actual">
          {data.actualStatus ?? "—"} {data.actualAmountClp ?? ""}
        </Meta>
        <Meta label="Creado">{new Date(data.createdAt).toLocaleString("es-CL")}</Meta>
      </div>
      <pre className="mb-6 overflow-auto rounded border border-neutral-800 bg-neutral-950 p-3 text-xs">
        {JSON.stringify(data.details, null, 2)}
      </pre>
      {!closed ? (
        <>
          <ConfirmAction
            title="Reconocer"
            confirmLabel="Marca el issue como visto. No corrige dinero."
            onConfirm={async () => {
              await api(`/v1/admin/reconciliation/issues/${id}/acknowledge`, { method: "POST" });
              await load();
            }}
          />
          <ConfirmAction
            title="Resolver"
            confirmLabel="Cierra el issue tras revisión humana. No muta el ledger."
            requireReason
            onConfirm={async (note) => {
              await api(`/v1/admin/reconciliation/issues/${id}/resolve`, {
                method: "POST",
                body: JSON.stringify({ note }),
              });
              await load();
            }}
          />
          <ConfirmAction
            title="Ignorar"
            confirmLabel="Ignora el issue. No corrige dinero."
            onConfirm={async () => {
              await api(`/v1/admin/reconciliation/issues/${id}/ignore`, { method: "POST" });
              router.push("/admin/reconciliation");
            }}
          />
        </>
      ) : null}
    </div>
  );
}
