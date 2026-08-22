"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { AdminRefundDetailView, AdminRefundRetryView } from "@tcg/types";
import { ConfirmAction, Meta } from "@/components/confirm-action";
import { OrderBadge, PaymentBadge, RefundBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AdminRefundDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AdminRefundDetailView | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api<AdminRefundDetailView>(`/v1/admin/refunds/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError("No se pudo cargar el refund"));
  }, [load]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/refunds" className="text-sm text-neutral-400 underline">
          Refunds
        </Link>
        <h1 className="mt-2 text-xl">Refund</h1>
        <RefundBadge status={data.status} />
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Monto">{formatClp(data.amountClp)}</Meta>
        <Meta label="Motivo">{data.reason}</Meta>
        <Meta label="MP refund id">
          <span className="font-mono text-xs">{data.providerRefundId ?? "—"}</span>
        </Meta>
        <Meta label="Creado">{data.createdAt}</Meta>
        <Meta label="Actualizado">{data.updatedAt}</Meta>
        <Meta label="Error operacional">{data.lastError ?? "—"}</Meta>
        <Meta label="Orden">
          <Link href={`/admin/orders/${data.orderId}`} className="underline">
            {data.order.orderNumber}
          </Link>{" "}
          <OrderBadge status={data.order.status} />
        </Meta>
        <Meta label="Pago">
          <Link href={`/admin/payments/${data.paymentId}`} className="underline">
            {formatClp(data.payment.amountClp)}
          </Link>{" "}
          <PaymentBadge status={data.payment.status} />
        </Meta>
      </section>
      {result ? <p className="text-sm text-emerald-400">{result}</p> : null}
      {data.status !== "COMPLETED" ? (
        <ConfirmAction
          title="Reintentar refund"
          confirmLabel="Se reutiliza RefundsService.execute. No se acepta amountClp desde la UI."
          onConfirm={async () => {
            const next = await api<AdminRefundRetryView>(`/v1/admin/refunds/${data.id}/retry`, {
              method: "POST",
              body: "{}",
            });
            setData(next.refund);
            setResult(`Resultado: ${next.outcome}${next.providerCalled ? "" : " (sin llamada al proveedor)"}`);
          }}
        />
      ) : null}
    </div>
  );
}
