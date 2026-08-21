"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import type { OrderView } from "@tcg/types";
import { ApiError } from "../../../../lib/api";
import { getOrder, postOrder } from "../../../../lib/orders";
import { ShipmentSummary } from "../../../../components/shipment-summary";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tracking, setTracking] = useState("");
  const [meetupPlace, setMeetupPlace] = useState("");

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
        <Link href="/me/ventas" className="underline">
          Ventas
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-neutral-600">
        {ORDER_STATUS_LABELS[order.status]} · {order.buyer.displayName} · {formatClp(order.totalClp)}
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Comisión snapshot {formatClp(order.commissionClp)} · pago {order.payment?.status ?? "pendiente"}
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
      <div className="mt-6 flex flex-col gap-3">
        {order.status === "PAID" ? (
          <button type="button" disabled={pending} className="w-fit rounded bg-black px-4 py-2 text-sm text-white" onClick={() => void run("prepare")}>
            Marcar en preparación
          </button>
        ) : null}
        {order.status === "PREPARING" && order.shippingMethod === "MEETUP" ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run("ship", { meetupPlace: meetupPlace || "A coordinar" });
            }}
          >
            <input
              value={meetupPlace}
              onChange={(event) => setMeetupPlace(event.target.value)}
              placeholder="Lugar y hora del encuentro"
              required
              className="rounded border px-3 py-2 text-sm"
            />
            <button type="submit" disabled={pending} className="w-fit rounded border px-4 py-2 text-sm">
              Listo para encuentro
            </button>
          </form>
        ) : null}
        {order.status === "PREPARING" && order.shippingMethod !== "MEETUP" ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run("ship", tracking ? { trackingCode: tracking } : {});
            }}
          >
            <input
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
              placeholder="Tracking (opcional)"
              className="rounded border px-3 py-2 text-sm"
            />
            <button type="submit" disabled={pending} className="rounded border px-4 py-2 text-sm">
              Marcar enviado
            </button>
          </form>
        ) : null}
        {order.status === "SHIPPED" || order.status === "READY_FOR_MEETUP" ? (
          <button type="button" disabled={pending} className="w-fit rounded border px-4 py-2 text-sm" onClick={() => void run("deliver")}>
            Marcar entregado
          </button>
        ) : null}
      </div>
    </main>
  );
}
