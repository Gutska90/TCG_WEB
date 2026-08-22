"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { REPORT_REASON_LABELS } from "@tcg/config";
import type { AdminReportDetailView } from "@tcg/types";
import { ConfirmAction, Meta } from "@/components/confirm-action";
import { ReportBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AdminReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AdminReportDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api<AdminReportDetailView>(`/v1/admin/reports/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError("No se pudo cargar el reporte"));
  }, [load]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando reporte…</p>;

  const closed = data.status === "RESOLVED" || data.status === "DISMISSED";

  async function act(path: string, body?: Record<string, string>) {
    await api(`/v1/admin/reports/${id}/${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : "{}",
    });
    await load();
  }

  return (
    <div className="grid gap-6">
      <p className="text-sm">
        <Link href="/admin/reports" className="underline">
          Reportes
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-semibold">{REPORT_REASON_LABELS[data.reason]}</h1>
        <div className="mt-2">
          <ReportBadge status={data.status} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Meta label="Reportero">
          {data.reporter.displayName} · {data.reporterEmail}
        </Meta>
        <Meta label="Objetivo">{data.targetSummary}</Meta>
        <Meta label="Descripción">{data.description || "—"}</Meta>
      </div>
      <section>
        <h2 className="mb-2 font-medium">Acciones de moderación previas</h2>
        <ul className="text-sm text-neutral-300">
          {data.priorActions.map((row) => (
            <li key={row.id}>
              {row.createdAt.slice(0, 16)} · {row.actionType} · {row.reason}
            </li>
          ))}
          {data.priorActions.length === 0 ? <li className="text-neutral-500">Ninguna</li> : null}
        </ul>
      </section>
      {closed ? null : (
        <div className="flex flex-wrap gap-3">
          <ConfirmAction title="Asignarme" confirmLabel="Pasa a IN_REVIEW." onConfirm={() => act("assign")} />
          <ConfirmAction
            title="Resolver"
            confirmLabel="Marca el reporte como resuelto. No suspende automáticamente."
            requireReason
            onConfirm={(note) => act("resolve", { outcome: "RESOLVED", note })}
          />
          <ConfirmAction
            title="Descartar"
            confirmLabel="Cierra el reporte como DISMISSED."
            requireReason
            onConfirm={(note) => act("resolve", { outcome: "DISMISSED", note })}
          />
        </div>
      )}
    </div>
  );
}
