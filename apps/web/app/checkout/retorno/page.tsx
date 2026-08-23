"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ORDER_STATUS_LABELS, PAYMENT_COPY, PAYMENT_STATUS_USER_LABELS, formatClp } from "@tcg/config";
import type { CheckoutView } from "@tcg/types";
import { ApiError } from "../../../lib/api";
import { userFacingError, loginHref } from "../../../lib/errors";
import { getCheckout, simulatePayment } from "../../../lib/orders";
import { FormError, LoadingBlock, PageMain, SandboxNotice, SuccessNote, buttonClass } from "../../../components/ui-feedback";

const POLL_MS = 2500;
const TIMEOUT_MS = 45_000;

function ReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const checkoutId = params.get("checkoutId");
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!checkoutId) return;
    let cancelled = false;
    const started = Date.now();
    async function poll() {
      try {
        const next = await getCheckout(checkoutId as string);
        if (cancelled) return;
        setCheckout(next);
        if (next.status !== "PENDING_PAYMENT") return;
        if (Date.now() - started >= TIMEOUT_MS) {
          setTimedOut(true);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginHref(`/checkout/retorno?checkoutId=${checkoutId}`));
          return;
        }
        if (!cancelled) setError(userFacingError(err));
      }
    }
    void poll();
    const timer = setInterval(() => {
      if (Date.now() - started >= TIMEOUT_MS) {
        setTimedOut(true);
        clearInterval(timer);
        return;
      }
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [checkoutId, router]);

  async function mockPay() {
    if (!checkoutId) return;
    setPending(true);
    setError(null);
    try {
      setCheckout(await simulatePayment(checkoutId));
      setTimedOut(false);
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  if (!checkoutId) {
    return (
      <PageMain>
        <h1 className="text-2xl font-semibold">Retorno de pago</h1>
        <p className="mt-3">Falta el checkout. No usamos los parámetros de Mercado Pago como prueba de pago.</p>
        <Link href="/me/compras" className="mt-4 inline-block underline">
          Ver mis compras
        </Link>
      </PageMain>
    );
  }
  if (error && !checkout) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!checkout) {
    return (
      <PageMain>
        <LoadingBlock label="Estamos confirmando el pago con el servidor…" />
      </PageMain>
    );
  }

  const payments = checkout.orders.map((order) => order.payment?.status);
  const rejected = payments.some((status) => status === "REJECTED");
  const paid = checkout.status === "PAID";
  const expired = checkout.status === "EXPIRED";
  const cancelled = checkout.status === "CANCELLED";

  let title = "Confirmando el pago";
  let body = "Consultamos el estado en el servidor. No usamos la URL de retorno como prueba de pago.";
  if (paid) {
    title = "Pago recibido";
    body = PAYMENT_COPY.held;
  } else if (rejected) {
    title = "Pago rechazado";
    body = "El procesador no aprobó el cobro. El stock se libera si corresponde.";
  } else if (expired) {
    title = "Checkout expirado";
    body = "Se acabó el tiempo de reserva. Vuelve al carrito si quieres intentar de nuevo.";
  } else if (cancelled) {
    title = "Checkout cancelado";
    body = "Este intento de pago ya no está activo.";
  } else if (timedOut) {
    title = "Sigue en proceso";
    body = "Aún no confirmamos el cobro. Puedes esperar o revisar Mis compras más tarde.";
  }

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {checkout.mercadopago.mock ? <div className="mt-4"><SandboxNotice /></div> : null}
      <p className="mt-3 text-text-muted">{body}</p>
      <p className="mt-4 font-medium">Total {formatClp(checkout.totalClp)}</p>
      <p className="mt-1 text-sm text-text-muted">Estado del checkout: {checkout.status}</p>
      <ul className="mt-6 grid gap-2 text-sm">
        {checkout.orders.map((order) => (
          <li key={order.id}>
            <Link href={`/me/compras/${order.id}`} className="underline">
              {order.orderNumber}
            </Link>{" "}
            · {ORDER_STATUS_LABELS[order.status]} ·{" "}
            {order.payment?.status ? PAYMENT_STATUS_USER_LABELS[order.payment.status] : "sin pago"}
          </li>
        ))}
      </ul>
      <FormError message={error} />
      {paid ? <SuccessNote message="Ya puedes ver las órdenes en Mis compras." /> : null}
      {checkout.mercadopago.mock && checkout.status === "PENDING_PAYMENT" ? (
        <button type="button" className={`${buttonClass} mt-6`} disabled={pending} onClick={() => void mockPay()}>
          {pending ? "Simulando…" : "Simular pago de prueba"}
        </button>
      ) : null}
      <p className="mt-8">
        <Link href="/me/compras" className="inline-flex min-h-11 items-center rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-white">
          Ver mis compras
        </Link>
      </p>
    </PageMain>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<PageMain><LoadingBlock /></PageMain>}>
      <ReturnInner />
    </Suspense>
  );
}
