"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminSystemView } from "@tcg/types";
import { api } from "@/lib/api";
import { JobBadge } from "@/components/status-badge";

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <li className="flex justify-between gap-4 text-sm">
      <span>{label}</span>
      <span className={on ? "text-amber-300" : "text-neutral-400"}>{on ? "activo" : "off"}</span>
    </li>
  );
}

export default function AdminSystemPage() {
  const [data, setData] = useState<AdminSystemView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<AdminSystemView>("/v1/admin/system")
      .then(setData)
      .catch(() => setError("No se pudo cargar el estado del sistema"));
  }, []);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando sistema…</p>;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-xl font-semibold">Sistema</h1>
        <p className="mt-1 text-sm text-neutral-400">Solo lectura. Kill switches vía env + redeploy.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-neutral-800 p-3">
            <dt className="text-xs text-neutral-500">API</dt>
            <dd>{data.api}</dd>
          </div>
          <div className="rounded border border-neutral-800 p-3">
            <dt className="text-xs text-neutral-500">Base de datos</dt>
            <dd>{data.database}</dd>
          </div>
          <div className="rounded border border-neutral-800 p-3">
            <dt className="text-xs text-neutral-500">Última conciliación</dt>
            <dd>
              {data.lastReconciliation
                ? `${data.lastReconciliation.status} · ${data.lastReconciliation.finishedAt ?? "en curso"}`
                : "sin runs"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">Flags y kill switches</h2>
        <ul className="max-w-lg divide-y divide-neutral-800 rounded border border-neutral-800">
          <Flag label="Pagos reales (MP live)" on={data.flags.enableRealPayments} />
          <Flag label="Payouts habilitados" on={data.flags.enablePayouts} />
          <Flag label="DISABLE_CHECKOUT" on={data.flags.disableCheckout} />
          <Flag label="DISABLE_NEW_LISTINGS" on={data.flags.disableNewListings} />
          <Flag label="DISABLE_PAYOUTS" on={data.flags.disablePayouts} />
          <Flag label="DISABLE_REFUNDS_AUTOMATION" on={data.flags.disableRefundsAutomation} />
          <Flag label="Jobs scheduler" on={data.flags.jobsEnabled} />
          <Flag label="Refund retry job" on={data.flags.refundRetryJobEnabled} />
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">Alertas</h2>
        {data.alerts.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin alertas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.alerts.map((alert) => (
              <li key={alert.code}>
                <Link href={alert.href} className="text-sm text-amber-300 hover:underline">
                  {alert.label} ({alert.count})
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">Últimos jobs</h2>
        {data.lastJobs.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin ejecuciones.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-neutral-500">
                <th className="py-1">Job</th>
                <th>Estado</th>
                <th>Duración</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.lastJobs.map((job) => (
                <tr key={job.id} className="border-t border-neutral-800">
                  <td className="py-2">
                    <Link href={`/admin/jobs/${job.id}`} className="hover:underline">
                      {job.jobName}
                    </Link>
                  </td>
                  <td>
                    <JobBadge status={job.status} />
                  </td>
                  <td>{job.durationMs != null ? `${job.durationMs} ms` : "—"}</td>
                  <td className="text-red-300">{job.errorCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
