"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { SHIPPING_METHOD_LABELS, formatClp, type ShippingMethod } from "@tcg/config";
import type { AddressView, CartView, ShippingQuoteView } from "@tcg/types";
import { ApiError, api, fetchMe } from "../../lib/api";
import { getCart } from "../../lib/cart";
import { createCheckout } from "../../lib/orders";
import { quoteShipping } from "../../lib/shipping";

const METHODS: ShippingMethod[] = ["MEETUP", "CHILEXPRESS", "BLUE_EXPRESS", "COORDINATED"];

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [addresses, setAddresses] = useState<AddressView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [methods, setMethods] = useState<Record<string, ShippingMethod>>({});
  const [addressId, setAddressId] = useState<string>("");
  const [quotes, setQuotes] = useState<Record<string, ShippingQuoteView | null>>({});

  useEffect(() => {
    Promise.all([getCart(), api<AddressView[]>("/v1/me/addresses"), fetchMe()])
      .then(([nextCart, nextAddresses]) => {
        setCart(nextCart);
        setAddresses(nextAddresses);
        setAddressId(nextAddresses.find((row) => row.isDefaultShipping)?.id ?? nextAddresses[0]?.id ?? "");
        const initial: Record<string, ShippingMethod> = {};
        for (const group of nextCart.groups) {
          initial[group.seller.id] = group.items.every((item) => item.listing.allowsMeetup)
            ? "MEETUP"
            : "CHILEXPRESS";
        }
        setMethods(initial);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/ingresar");
          return;
        }
        setError(err instanceof ApiError ? err.message : "No se pudo cargar el checkout");
      });
  }, [router]);

  const needsAddress = useMemo(
    () => Object.values(methods).some((method) => method !== "MEETUP"),
    [methods],
  );
  const selectedAddress = addresses.find((row) => row.id === addressId) ?? addresses[0];

  useEffect(() => {
    if (!cart) return;
    const destComuna = selectedAddress?.comuna ?? "Santiago";
    let cancelled = false;
    void Promise.all(
      cart.groups.map(async (group) => {
        const method = methods[group.seller.id] ?? "MEETUP";
        try {
          const quote = await quoteShipping(group.seller.id, method, destComuna);
          return [group.seller.id, quote] as const;
        } catch {
          return [group.seller.id, null] as const;
        }
      }),
    ).then((rows) => {
      if (cancelled) return;
      const next: Record<string, ShippingQuoteView | null> = {};
      for (const [sellerId, quote] of rows) {
        next[sellerId] = quote;
      }
      setQuotes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [cart, methods, selectedAddress?.comuna]);

  const shippingTotalClp = useMemo(
    () =>
      cart?.groups.reduce((sum, group) => sum + (quotes[group.seller.id]?.priceClp ?? 0), 0) ?? 0,
    [cart, quotes],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cart) return;
    setPending(true);
    setError(null);
    try {
      const checkout = await createCheckout(
        cart.groups.map((group) => ({
          sellerId: group.seller.id,
          method: methods[group.seller.id] ?? "MEETUP",
          addressId: (methods[group.seller.id] ?? "MEETUP") === "MEETUP" ? undefined : addressId,
        })),
      );
      if (checkout.mercadopago.initPoint) {
        window.location.href = checkout.mercadopago.initPoint;
        return;
      }
      router.push(`/checkout/retorno?checkoutId=${checkout.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el pedido");
    } finally {
      setPending(false);
    }
  }

  if (error && !cart) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-red-700">{error}</main>;
  }
  if (!cart) {
    return <main className="mx-auto max-w-2xl px-6 py-12 text-neutral-500">Cargando…</main>;
  }
  if (cart.itemCount === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p>Tu carrito está vacío.</p>
        <Link href="/carrito" className="underline">
          Volver al carrito
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Pagar</h1>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-8 grid gap-6">
        {cart.groups.map((group) => {
          const quote = quotes[group.seller.id];
          const method = methods[group.seller.id] ?? "MEETUP";
          return (
            <fieldset key={group.seller.id} className="rounded border p-4">
              <legend className="font-medium">{group.seller.displayName}</legend>
              <p className="mt-1 text-sm text-neutral-600">{formatClp(group.subtotalClp)} en productos</p>
              <label className="mt-3 block text-sm">
                Entrega
                <select
                  className="mt-1 w-full rounded border px-3 py-2"
                  value={method}
                  onChange={(event) =>
                    setMethods((current) => ({
                      ...current,
                      [group.seller.id]: event.target.value as ShippingMethod,
                    }))
                  }
                >
                  {METHODS.filter(
                    (option) =>
                      (option === "MEETUP" && group.items.every((item) => item.listing.allowsMeetup)) ||
                      (option !== "MEETUP" && group.items.every((item) => item.listing.allowsShipping)),
                  ).map((option) => (
                    <option key={option} value={option}>
                      {SHIPPING_METHOD_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-2 text-sm text-neutral-600">
                Envío: {quote ? formatClp(quote.priceClp) : "Sin tarifa para este destino"}
              </p>
            </fieldset>
          );
        })}
        {needsAddress ? (
          <label className="text-sm">
            Dirección de envío
            {addresses.length === 0 ? (
              <p className="mt-2">
                Necesitas una dirección con teléfono.{" "}
                <Link href="/me/direcciones" className="underline">
                  Agregar
                </Link>
              </p>
            ) : (
              <select
                className="mt-1 w-full rounded border px-3 py-2"
                value={addressId}
                onChange={(event) => setAddressId(event.target.value)}
                required
              >
                {addresses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}: {row.line1}, {row.comuna}
                  </option>
                ))}
              </select>
            )}
          </label>
        ) : null}
        <p className="text-sm text-neutral-700">
          Productos {formatClp(cart.productTotalClp)} · Envío {formatClp(shippingTotalClp)} · Total{" "}
          {formatClp(cart.productTotalClp + shippingTotalClp)}
        </p>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || (needsAddress && !addressId)}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Creando pedido…" : "Confirmar y pagar"}
        </button>
      </form>
    </main>
  );
}
