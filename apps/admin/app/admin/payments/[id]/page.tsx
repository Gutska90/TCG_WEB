"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { AdminPaymentDetailView } from "@tcg/types";
import { Meta } from "@/components/confirm-action";
import { PaymentBadge, RefundBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AdminPaymentDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<AdminPaymentDetailView>(`/v1/admin/payments/${id}`)
      .then(setData)
      .catch(() => setError("No se pudo cargar el pago"));
  }, [id]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/payments" className="text-sm text-neutral-400 underline">
          Pagos
        </Link>
        <h1 className="mt-2 text-xl">Pago</h1>
        <PaymentBadge status={data.status} />
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Meta label="Monto">{formatClp(data.amountClp)}</Meta>
        <Meta label="MP id">
          <span className="font-mono text-xs">{data.providerPaymentId ?? "—"}</span>
        </Meta>
        <Meta label="Proveedor">{data.provider}</Meta>
        <Meta label="Recibido">{data.heldAt ?? "—"}</Meta>
        <Meta label="Elegible liquidación">{data.releasedAt ?? "—"}</Meta>
        <Meta label="REFUNDED">{data.refundedAt ?? "—"}</Meta>
        <Meta label="Orden">
          <Link href={`/admin/orders/${data.orderId}`} className="underline">
            {data.order.orderNumber}
          </Link>
        </Meta>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Refunds</h2>
        {data.refunds.length === 0 ? (
          <p className="text-sm text-neutral-500">Ninguno</p>
        ) : (
          <ul className="text-sm">
            {data.refunds.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/refunds/${row.id}`} className="underline">
                  {formatClp(row.amountClp)}
                </Link>{" "}
                <RefundBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
