"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_USER_LABELS, formatClp } from "@tcg/config";
import type { OrderView } from "@tcg/types";
import { ApiError } from "../../../../lib/api";
import { userFacingError, loginHref } from "../../../../lib/errors";
import { getOrder, postOrder, rateOrder } from "../../../../lib/orders";
import { OpenDisputeForm } from "../../../../components/open-dispute-form";
import { AddToCollectionButton } from "../../../../components/add-to-collection";
import { OrderTimeline } from "../../../../components/order-timeline";
import { ShipmentSummary } from "../../../../components/shipment-summary";
import { FormError, LoadingBlock, PageMain, SuccessNote, buttonClass, buttonSecondaryClass } from "../../../../components/ui-feedback";

const DISPUTE_STATUSES = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "DISPUTED",
];

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref(`/me/compras/${id}`));
        else setError(userFacingError(err));
      });
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
        <Link href="/me/compras" className="underline">
          Compras
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{order.orderNumber}</h1>
      <p className="mt-1 text-text-muted">
        {ORDER_STATUS_LABELS[order.status]} · {order.seller.displayName} · {formatClp(order.totalClp)}
      </p>
      <p className="mt-2 text-sm text-text-muted">
        Pago: {order.payment?.status ? PAYMENT_STATUS_USER_LABELS[order.payment.status] : "pendiente"}
      </p>
      <ul className="mt-6 grid gap-2 text-sm">
        {order.items.map((item) => (
          <li key={item.listingId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {item.titleSnapshot} · {CARD_CONDITION_LABELS[item.condition]} · {item.quantity} ×{" "}
              {formatClp(item.unitPriceClp)}
            </span>
            {order.status === "COMPLETED" ? (
              <AddToCollectionButton
                variantId={item.variantId}
                defaultCondition={item.condition}
                defaultQuantity={item.quantity}
                defaultPriceClp={item.unitPriceClp}
                label="Añadir a colección"
              />
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-text-muted">
        Productos {formatClp(order.subtotalClp)} · Envío {formatClp(order.shippingClp)} · Total {formatClp(order.totalClp)}
      </p>
      <ShipmentSummary order={order} />
      <OrderTimeline order={order} />
      <FormError message={error} />
      <SuccessNote message={success} />
      <div className="mt-6 flex flex-wrap gap-3">
        {order.status === "PENDING_PAYMENT" ? (
          <button type="button" disabled={pending} className={buttonSecondaryClass} onClick={() => void run("cancel", {}, "Pedido cancelado.")}>
            Cancelar
          </button>
        ) : null}
        {order.status === "DELIVERED" ? (
          <button
            type="button"
            disabled={pending}
            className={buttonClass}
            onClick={() => void run("confirm", {}, "Recepción confirmada.")}
          >
            Confirmar recepción
          </button>
        ) : null}
      </div>
      {DISPUTE_STATUSES.includes(order.status) && order.status !== "DISPUTED" ? <OpenDisputeForm orderId={order.id} /> : null}
      {order.status === "DISPUTED" ? (
        <p className="mt-6 text-sm">
          Hay un reclamo abierto.{" "}
          <Link href="/me/disputas" className="underline">
            Ver reclamos
          </Link>
        </p>
      ) : null}
      {order.status === "COMPLETED" && !order.rating ? (
        <form
          className="mt-8 grid gap-3 rounded-[16px] border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            void rateOrder(id, { stars, comment: comment || undefined })
              .then(() => getOrder(id))
              .then(setOrder)
              .catch((err: unknown) => setError(userFacingError(err)))
              .finally(() => setPending(false));
          }}
        >
          <h2 className="font-medium">Valorar vendedor</h2>
          <label className="text-sm">
            Estrellas
            <select
              className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2"
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
              className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
            />
          </label>
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? "Enviando…" : "Publicar valoración"}
          </button>
        </form>
      ) : null}
      {order.rating ? (
        <p className="mt-6 text-sm text-text-muted">
          Tu valoración: {order.rating.stars} ★
          {order.rating.comment ? ` · ${order.rating.comment}` : ""}
        </p>
      ) : null}
      <p className="mt-8 text-sm">
        <Link href="/ayuda" className="underline">
          Ayuda
        </Link>
        {" · "}
        <Link href="/refunds" className="underline">
          Reembolsos
        </Link>
      </p>
    </PageMain>
  );
}
