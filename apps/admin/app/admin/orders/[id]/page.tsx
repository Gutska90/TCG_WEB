"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { AdminOrderDetailView } from "@tcg/types";
import { ConfirmAction, Meta } from "@/components/confirm-action";
import { OrderBadge, PaymentBadge, RefundBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

const CANCELABLE = new Set(["PENDING_PAYMENT", "PAID", "PREPARING"]);

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AdminOrderDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api<AdminOrderDetailView>(`/v1/admin/orders/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError("No se pudo cargar la orden"));
  }, [load]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  const refund = data.refunds.find((row) => row.status === "FAILED" || row.status === "PENDING");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-neutral-400 underline">
          Órdenes
        </Link>
        <h1 className="mt-2 font-mono text-xl">{data.orderNumber}</h1>
        <OrderBadge status={data.status} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Total">{formatClp(data.totalClp)}</Meta>
        <Meta label="Subtotal">{formatClp(data.subtotalClp)}</Meta>
        <Meta label="Envío">{formatClp(data.shippingClp)}</Meta>
        <Meta label="Comisión TCG Market">{formatClp(data.commissionClp)}</Meta>
        <Meta label="Buyer">
          {data.buyer.email}
          <span className="block text-neutral-500">{data.buyer.displayName}</span>
        </Meta>
        <Meta label="Seller">
          {data.seller.email}
          <span className="block text-neutral-500">{data.seller.displayName}</span>
        </Meta>
        <Meta label="Checkout">
          {data.checkout.status} · {formatClp(data.checkout.totalClp)}
        </Meta>
        <Meta label="Envío método">{data.shippingMethod}</Meta>
      </section>

      {data.marketplaceFee ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Plan vendedor">{data.marketplaceFee.planCode ?? "sin snapshot"}</Meta>
          <Meta label="Política">{data.marketplaceFee.policyVersion ?? "—"}</Meta>
          <Meta label="Promo">{data.marketplaceFee.promotionCode ?? "ninguna"}</Meta>
          <Meta label="Fee / cap">
            {data.marketplaceFee.feeBps ?? "—"} bps / {data.marketplaceFee.feeCapClp ?? "—"}
          </Meta>
          <Meta label="Comisión TCG Market">{formatClp(data.marketplaceFee.platformFeeClp)}</Meta>
          <Meta label="Seller payable">{formatClp(data.marketplaceFee.sellerPayableClp)}</Meta>
          <Meta label="Costo medio de pago">Se calcula por separado</Meta>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Ítems</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Título</th>
              <th>Qty</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={`${item.listingId}-${item.variantId}`} className="border-t border-neutral-800">
                <td className="py-2">{item.titleSnapshot}</td>
                <td>{item.quantity}</td>
                <td>{formatClp(item.lineTotalClp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Pago</h2>
        {data.payment ? (
          <p className="text-sm">
            <Link href={`/admin/payments/${data.payment.id}`} className="underline">
              {formatClp(data.payment.amountClp)}
            </Link>{" "}
            <PaymentBadge status={data.payment.status} />{" "}
            <span className="font-mono text-xs">{data.payment.providerPaymentId ?? "—"}</span>
          </p>
        ) : (
          <p className="text-sm text-neutral-500">Sin pago</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Refunds</h2>
        {data.refunds.length === 0 ? (
          <p className="text-sm text-neutral-500">Ninguno</p>
        ) : (
          <ul className="text-sm">
            {data.refunds.map((row) => (
              <li key={row.id} className="flex gap-3 py-1">
                <Link href={`/admin/refunds/${row.id}`} className="underline">
                  {formatClp(row.amountClp)}
                </Link>
                <RefundBadge status={row.status} />
                <span>{row.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.shipment ? (
        <Meta label="Shipment">
          {data.shipment.status} · {data.shipment.method}
        </Meta>
      ) : null}

      {CANCELABLE.has(data.status) ? (
        <ConfirmAction
          title="Cancelar orden"
          confirmLabel="Esto usa la lógica de dominio (locks, stock, refund si hay pago). No es un UPDATE directo."
          requireReason
          onConfirm={async (reason) => {
            const next = await api<AdminOrderDetailView>(`/v1/admin/orders/${data.id}/cancel`, {
              method: "POST",
              body: JSON.stringify({ reason }),
            });
            setData(next);
          }}
        />
      ) : null}

      {refund && refund.status !== "COMPLETED" ? (
        <ConfirmAction
          title="Reintentar refund"
          confirmLabel="Se llama a RefundsService.execute. El monto sale del Payment persistido."
          onConfirm={async () => {
            await api(`/v1/admin/refunds/${refund.id}/retry`, {
              method: "POST",
              body: "{}",
            });
            await load();
          }}
        />
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase">Timeline</h2>
        <ul className="text-xs text-neutral-400">
          {data.timeline.map((event) => (
            <li key={event.id} className="border-t border-neutral-800 py-2">
              <span className="font-mono">{event.createdAt}</span> · {event.action} · {event.entityType}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
