"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ORDER_STATUS_LABELS, formatClp } from "@tcg/config";
import type { CheckoutView } from "@tcg/types";
import { ApiError } from "../../../lib/api";
import { getCheckout, simulatePayment } from "../../../lib/orders";

function ReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const checkoutId = params.get("checkoutId");
  const [checkout, setCheckout] = useState<CheckoutView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!checkoutId) return;
    let cancelled = false;
    async function poll() {
      try {
        const next = await getCheckout(checkoutId as string);
        if (!cancelled) setCheckout(next);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/ingresar");
          return;
        }
        if (!cancelled) setError(err instanceof ApiError ? err.message : "No se pudo confirmar el pago");
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [checkoutId, router]);

  async function mockPay() {
    if (!checkoutId) return;
    setPending(true);
    try {
      setCheckout(await simulatePayment(checkoutId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo simular el pago");
    } finally {
      setPending(false);
    }
  }

  if (!checkoutId) {
    return <main className="mx-auto max-w-2xl px-6 py-12">Falta el checkout.</main>;
  }
  if (error && !checkout) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-red-700">{error}</main>;
  }
  if (!checkout) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-neutral-500">Estamos confirmando el pago…</main>;
  }

  const paid = checkout.status === "PAID";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">{paid ? "Pago recibido" : "Confirmando el pago"}</h1>
      <p className="mt-2 text-neutral-600">
        {paid
          ? "El dinero queda retenido en la plataforma hasta que confirmes la recepción."
          : "No usamos la URL de retorno de Mercado Pago como prueba de pago. Esperamos el webhook o, en local, un pago simulado."}
      </p>
      <p className="mt-4 font-medium">Total {formatClp(checkout.totalClp)}</p>
      <ul className="mt-6 grid gap-2 text-sm">
        {checkout.orders.map((order) => (
          <li key={order.id}>
            <Link href={`/me/compras/${order.id}`} className="underline">
              {order.orderNumber}
            </Link>{" "}
            · {ORDER_STATUS_LABELS[order.status]} · {order.payment?.status ?? "sin pago"}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {checkout.mercadopago.mock && checkout.status === "PENDING_PAYMENT" ? (
        <button
          type="button"
          className="mt-6 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={pending}
          onClick={() => void mockPay()}
        >
          {pending ? "Simulando…" : "Simular pago (desarrollo)"}
        </button>
      ) : null}
      {checkout.mercadopago.initPoint && checkout.status === "PENDING_PAYMENT" ? (
        <a href={checkout.mercadopago.initPoint} className="mt-6 inline-block underline">
          Ir a Mercado Pago
        </a>
      ) : null}
    </main>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<main className="px-6 py-12 text-neutral-500">Cargando…</main>}>
      <ReturnInner />
    </Suspense>
  );
}
