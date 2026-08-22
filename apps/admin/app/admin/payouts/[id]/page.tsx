"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { AdminPayoutDetailView } from "@tcg/types";
import { ConfirmAction, Meta } from "@/components/confirm-action";
import { PayoutBadge } from "@/components/status-badge";
import { ApiError, api } from "@/lib/api";

export default function AdminPayoutDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AdminPayoutDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api<AdminPayoutDetailView>(`/v1/admin/payouts/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError("No se pudo cargar el payout"));
  }, [load]);

  async function mutate(path: string, body: Record<string, string>) {
    await api(`/v1/admin/payouts/${id}/${path}`, { method: "POST", body: JSON.stringify(body) });
    await load();
  }

  async function onPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const providerRef = String(form.get("providerRef") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    try {
      await mutate("mark-paid", { providerRef, ...(reason ? { reason } : {}) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo marcar pagado");
    }
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/payouts" className="text-sm text-neutral-400 underline">
          Payouts
        </Link>
        <h1 className="mt-2 font-mono text-xl">{data.id}</h1>
        <PayoutBadge status={data.status} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Seller">
          <Link href={`/admin/sellers/${data.seller.id}/balance`} className="underline">
            {data.seller.displayName}
          </Link>
          <span className="block text-neutral-500">{data.seller.email}</span>
        </Meta>
        <Meta label="Monto">{formatClp(data.amountClp)}</Meta>
        <Meta label="Método">{data.method}</Meta>
        <Meta label="providerRef">{data.providerRef ?? "—"}</Meta>
        <Meta label="Creado">{data.createdAt}</Meta>
        <Meta label="Pagado">{data.paidAt ?? "—"}</Meta>
        <Meta label="Error">{data.lastError ?? "—"}</Meta>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Ítems</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Orden</th>
              <th>Gross</th>
              <th>Comisión</th>
              <th>Neto</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id} className="border-t border-neutral-800">
                <td className="py-2 font-mono text-xs">
                  <Link href={`/admin/orders/${item.orderId}`} className="underline">
                    {item.orderNumber}
                  </Link>
                </td>
                <td>{formatClp(item.grossClp)}</td>
                <td>{formatClp(item.commissionClp)}</td>
                <td>{formatClp(item.netClp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Ledger</h2>
        <ul className="text-sm">
          {data.ledger.map((row) => (
            <li key={row.id} className="border-t border-neutral-800 py-2 font-mono text-xs">
              {row.entryType} · {formatClp(row.amountClp)} · {row.createdAt}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Timeline</h2>
        <ul className="text-sm">
          {data.timeline.map((event) => (
            <li key={event.id} className="border-t border-neutral-800 py-2">
              {event.action} · {event.createdAt}
            </li>
          ))}
        </ul>
      </section>

      {data.status === "PENDING" ? (
        <ConfirmAction
          title="Aprobar"
          confirmLabel="Aprobar este payout. No transfiere dinero."
          onConfirm={(reason) => mutate("approve", reason ? { reason } : {})}
        />
      ) : null}
      {data.status === "APPROVED" ? (
        <ConfirmAction
          title="Marcar en proceso"
          confirmLabel="Pasar a PROCESSING. Sigue siendo manual."
          onConfirm={(reason) => mutate("mark-processing", reason ? { reason } : {})}
        />
      ) : null}
      {data.status === "FAILED" ? (
        <ConfirmAction
          title="Reintentar procesamiento"
          confirmLabel="FAILED → PROCESSING. No llama al banco."
          onConfirm={(reason) => mutate("mark-processing", reason ? { reason } : {})}
        />
      ) : null}
      {data.status === "PROCESSING" ? (
        <form onSubmit={onPaid} className="rounded border border-emerald-900 bg-emerald-950/30 p-4">
          <p className="text-sm">Marcar pagado. providerRef obligatorio (comprobante externo).</p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            providerRef
            <input
              name="providerRef"
              required
              minLength={1}
              className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-xs"
            />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            Motivo (opcional)
            <input name="reason" className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
          </label>
          <button type="submit" className="mt-3 rounded bg-white px-3 py-2 text-sm text-neutral-950">
            Marcar PAID
          </button>
        </form>
      ) : null}
      {data.status === "PROCESSING" ? (
        <ConfirmAction
          title="Marcar fallido"
          confirmLabel="PROCESSING → FAILED"
          requireReason
          onConfirm={(reason) => mutate("fail", { reason })}
        />
      ) : null}
      {data.status === "PENDING" || data.status === "APPROVED" ? (
        <ConfirmAction
          title="Cancelar"
          confirmLabel="Libera las órdenes. No transfiere dinero."
          requireReason
          onConfirm={(reason) => mutate("cancel", { reason })}
        />
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
