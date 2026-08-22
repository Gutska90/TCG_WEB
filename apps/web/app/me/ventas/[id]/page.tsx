"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_USER_LABELS, SHIPPING_METHOD_LABELS, formatClp } from "@tcg/config";
import type { OrderView, SellerBalanceView } from "@tcg/types";
import { ApiError, api } from "../../../../lib/api";
import { userFacingError, loginHref } from "../../../../lib/errors";
import { getOrder, postOrder } from "../../../../lib/orders";
import { OrderTimeline } from "../../../../components/order-timeline";
import { ShipmentSummary } from "../../../../components/shipment-summary";
import { FormError, LoadingBlock, PageMain, SuccessNote, buttonClass, buttonSecondaryClass } from "../../../../components/ui-feedback";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [balance, setBalance] = useState<SellerBalanceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tracking, setTracking] = useState("");
  const [meetupPlace, setMeetupPlace] = useState("");

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref(`/me/ventas/${id}`));
        else setError(userFacingError(err));
      });
    void api<SellerBalanceView>("/v1/me/balance")
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [id, router]);

  async function run(action: string, body: Record<string, string> = {}, ok?: string) {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      setOrder(await postOrder(id, action, body));
      if (ok) setSuccess(ok);
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  if (error && !order) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!order) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain>
      <p className="text-sm">
        <Link href="/me/ventas" className="underline">
          Ventas
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-neutral-600">
        {ORDER_STATUS_LABELS[order.status]} · Comprador {order.buyer.displayName} · {formatClp(order.totalClp)}
      </p>
      <p className="mt-2 text-sm text-neutral-600">
        Comisión {formatClp(order.commissionClp)} · pago{" "}
        {order.payment?.status ? PAYMENT_STATUS_USER_LABELS[order.payment.status] : "pendiente"}
      </p>
      <p className="mt-1 text-sm text-neutral-600">Entrega: {SHIPPING_METHOD_LABELS[order.shippingMethod]}</p>
      <ul className="mt-6 grid gap-2 text-sm">
        {order.items.map((item) => (
          <li key={item.listingId}>
            {item.titleSnapshot} · {CARD_CONDITION_LABELS[item.condition]} · {item.quantity} × {formatClp(item.unitPriceClp)}
          </li>
        ))}
      </ul>
      <ShipmentSummary order={order} />
      <OrderTimeline order={order} />
      {balance ? (
        <p className="mt-4 text-sm text-neutral-600">
          Saldo estimado: pendiente {formatClp(balance.pendingClp)} · disponible {formatClp(balance.availableClp)}.{" "}
          <Link href="/me/balance" className="underline">
            Ver saldo
          </Link>
        </p>
      ) : null}
      <FormError message={error} />
      <SuccessNote message={success} />
      <div className="mt-6 flex flex-col gap-3">
        {order.status === "PAID" ? (
          <button type="button" disabled={pending} className={buttonClass} onClick={() => void run("prepare", {}, "Marcada en preparación.")}>
            Marcar en preparación
          </button>
        ) : null}
        {order.status === "PREPARING" && order.shippingMethod === "MEETUP" ? (
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run("ship", { meetupPlace: meetupPlace || "A coordinar" }, "Listo para el encuentro.");
            }}
          >
            <label className="text-sm">
              Lugar y hora del encuentro
              <input
                value={meetupPlace}
                onChange={(event) => setMeetupPlace(event.target.value)}
                required
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </label>
            <button type="submit" disabled={pending} className={buttonSecondaryClass}>
              Listo para encuentro
            </button>
          </form>
        ) : null}
        {order.status === "PREPARING" && order.shippingMethod !== "MEETUP" ? (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void run("ship", tracking ? { trackingCode: tracking } : {}, "Marcada como enviada.");
            }}
          >
            <label className="text-sm sm:flex-1">
              Tracking (opcional)
              <input
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
              />
            </label>
            <button type="submit" disabled={pending} className={`${buttonSecondaryClass} sm:self-end`}>
              Marcar enviado
            </button>
          </form>
        ) : null}
        {order.status === "SHIPPED" || order.status === "READY_FOR_MEETUP" ? (
          <button type="button" disabled={pending} className={buttonSecondaryClass} onClick={() => void run("deliver", {}, "Marcada como entregada.")}>
            Marcar entregado
          </button>
        ) : null}
      </div>
      {order.status === "DISPUTED" ? (
        <p className="mt-6 text-sm">
          Hay un reclamo.{" "}
          <Link href="/me/disputas" className="underline">
            Ver reclamos
          </Link>
        </p>
      ) : null}
      <p className="mt-8 text-sm">
        <Link href="/ayuda" className="underline">
          Ayuda
        </Link>
        {" · "}
        <Link href="/marketplace" className="underline">
          Reglas del marketplace
        </Link>
      </p>
    </PageMain>
  );
}
