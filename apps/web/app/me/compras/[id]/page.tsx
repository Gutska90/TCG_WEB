"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import type { OrderView } from "@tcg/types";
import { ApiError } from "../../../../lib/api";
import { getOrder, postOrder, rateOrder } from "../../../../lib/orders";
import { ShipmentSummary } from "../../../../components/shipment-summary";

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/ingresar");
        else setError(err instanceof ApiError ? err.message : "No se pudo cargar");
      });
  }, [id, router]);

  async function run(action: string, body: Record<string, string> = {}) {
    setPending(true);
    setError(null);
    try {
      setOrder(await postOrder(id, action, body));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  }

  if (error && !order) return <main className="px-6 py-12 text-red-700">{error}</main>;
  if (!order) return <main className="px-6 py-12 text-neutral-500">Cargando…</main>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm">
        <Link href="/me/compras" className="underline">
          Compras
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-neutral-600">
        {ORDER_STATUS_LABELS[order.status]} · {order.seller.displayName} · {formatClp(order.totalClp)}
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Pago: {order.payment?.status ?? "pendiente"} {order.payment?.heldAt ? "· retenido" : ""}
      </p>
      <ul className="mt-6 grid gap-2 text-sm">
        {order.items.map((item) => (
          <li key={item.listingId}>
            {item.titleSnapshot} · {CARD_CONDITION_LABELS[item.condition]} · {item.quantity} ×{" "}
            {formatClp(item.unitPriceClp)}
          </li>
        ))}
      </ul>
      <ShipmentSummary order={order} />
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {order.status === "PENDING_PAYMENT" ? (
          <button type="button" disabled={pending} className="rounded border px-4 py-2 text-sm" onClick={() => void run("cancel")}>
            Cancelar
          </button>
        ) : null}
        {order.status === "DELIVERED" ? (
          <button type="button" disabled={pending} className="rounded bg-black px-4 py-2 text-sm text-white" onClick={() => void run("confirm")}>
            Confirmar recepción
          </button>
        ) : null}
        {["PAID", "PREPARING", "SHIPPED", "READY_FOR_MEETUP", "DELIVERED"].includes(order.status) ? (
          <button
            type="button"
            disabled={pending}
            className="rounded border px-4 py-2 text-sm"
            onClick={() => void run("dispute", { reason: "Problema con el pedido" })}
          >
            Abrir reclamo
          </button>
        ) : null}
      </div>
      {order.status === "COMPLETED" && !order.rating ? (
        <form
          className="mt-8 grid gap-3 rounded border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            void rateOrder(id, { stars, comment: comment || undefined })
              .then(() => getOrder(id))
              .then(setOrder)
              .catch((err: unknown) => {
                setError(err instanceof ApiError ? err.message : "No se pudo valorar");
              })
              .finally(() => setPending(false));
          }}
        >
          <h2 className="font-medium">Valorar vendedor</h2>
          <label className="text-sm">
            Estrellas
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={stars}
              onChange={(event) => setStars(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Comentario (opcional)
            <textarea
              className="mt-1 w-full rounded border px-3 py-2"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
            />
          </label>
          <button type="submit" disabled={pending} className="w-fit rounded bg-black px-4 py-2 text-sm text-white">
            {pending ? "Enviando…" : "Publicar valoración"}
          </button>
        </form>
      ) : null}
      {order.rating ? (
        <p className="mt-6 text-sm text-neutral-600">
          Tu valoración: {order.rating.stars} ★
          {order.rating.comment ? ` · ${order.rating.comment}` : ""}
        </p>
      ) : null}
    </main>
  );
}
