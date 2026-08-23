"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { CARD_CONDITION_LABELS, LEGAL, SHIPPING_METHOD_LABELS, formatClp, type ShippingMethod } from "@tcg/config";
import type { AddressView, CartView, PublicPlatformConfig, ShippingQuoteView } from "@tcg/types";
import { ApiError, api, fetchMe } from "../../lib/api";
import { fetchPublicConfig } from "../../lib/config";
import { getCart } from "../../lib/cart";
import { userFacingError, loginHref } from "../../lib/errors";
import { createCheckout } from "../../lib/orders";
import { quoteShipping } from "../../lib/shipping";
import { FormError, LoadingBlock, PageMain, SandboxNotice } from "../../components/ui-feedback";
import { buttonClassName } from "../../components/ui/button-styles";
import { controlClassName } from "../../components/ui/input";

const METHODS: ShippingMethod[] = ["MEETUP", "CHILEXPRESS", "BLUE_EXPRESS", "COORDINATED"];

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [addresses, setAddresses] = useState<AddressView[]>([]);
  const [sandbox, setSandbox] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [methods, setMethods] = useState<Record<string, ShippingMethod>>({});
  const [addressId, setAddressId] = useState<string>("");
  const [quotes, setQuotes] = useState<Record<string, ShippingQuoteView | null>>({});

  useEffect(() => {
    Promise.all([
      getCart(),
      api<AddressView[]>("/v1/me/addresses"),
      fetchMe(),
      fetchPublicConfig().catch((): PublicPlatformConfig | null => null),
    ])
      .then(([nextCart, nextAddresses, me, config]) => {
        if (!me.emailVerified) {
          setError("Verifica tu email antes de pagar.");
        }
        setSandbox(config?.features.paymentsSandbox ?? true);
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
          router.replace(loginHref("/checkout"));
          return;
        }
        setError(userFacingError(err));
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
      if (checkout.mercadopago.initPoint && !checkout.mercadopago.mock) {
        window.location.href = checkout.mercadopago.initPoint;
        return;
      }
      router.push(`/checkout/retorno?checkoutId=${checkout.id}`);
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  if (error && !cart) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!cart) {
    return (
      <PageMain>
        <LoadingBlock label="Cargando el checkout…" />
      </PageMain>
    );
  }
  if (cart.itemCount === 0) {
    return (
      <PageMain>
        <h1 className="text-2xl font-semibold">Pagar</h1>
        <p className="mt-4">
          Tu carrito está vacío.{" "}
          <Link href="/buscar" className="underline">
            Buscar cartas
          </Link>
        </p>
      </PageMain>
    );
  }

  return (
    <PageMain width="xl">
      <h1 className="text-3xl font-medium tracking-tight">Pagar</h1>
      <p className="mt-2 text-sm text-text-muted">{LEGAL.betaProductNotice}</p>
      <div className="mt-4">{sandbox ? <SandboxNotice /> : null}</div>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-6">
        {cart.groups.map((group) => {
          const quote = quotes[group.seller.id];
          const method = methods[group.seller.id] ?? "MEETUP";
          return (
            <fieldset key={group.seller.id} className="rounded-[16px] border border-border bg-surface p-4">
              <legend className="px-1 font-medium">Vendedor: {group.seller.displayName}</legend>
              <ul className="mt-3 grid gap-2 text-sm">
                {group.items.map((item) => (
                  <li key={item.listingId} className="flex justify-between gap-3">
                    <span>
                      {item.listing.title} · {CARD_CONDITION_LABELS[item.listing.condition]} · x{item.quantity}
                    </span>
                    <span className="tabular-nums">{formatClp(item.lineTotalClp)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-text-muted">Subtotal productos {formatClp(group.subtotalClp)}</p>
              <label className="mt-3 block text-sm">
                Entrega
                <select
                  className={`mt-1 ${controlClassName}`}
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
              <p className="mt-2 text-sm text-text-muted">
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
                className={`mt-1 ${controlClassName}`}
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
        </div>
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-[16px] border border-border bg-surface p-4">
            <h2 className="font-medium">Resumen</h2>
            <dl className="mt-3 grid gap-1 text-sm">
              <div className="flex justify-between">
                <dt>Productos</dt>
                <dd className="tabular-nums">{formatClp(cart.productTotalClp)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Envío</dt>
                <dd className="tabular-nums">{formatClp(shippingTotalClp)}</dd>
              </div>
              <div className="mt-2 flex justify-between font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatClp(cart.productTotalClp + shippingTotalClp)}</dd>
              </div>
            </dl>
            <FormError message={error} />
            <p className="mt-3 text-sm text-text-muted">
              Al continuar aceptas los{" "}
              <Link href="/terminos" className="underline">
                Términos
              </Link>
              , las{" "}
              <Link href="/marketplace" className="underline">
                reglas del marketplace
              </Link>{" "}
              y{" "}
              <Link href="/refunds" className="underline">
                reembolsos
              </Link>
              .
            </p>
            <button
              type="submit"
              disabled={pending || (needsAddress && !addressId)}
              className={buttonClassName("primary", "mt-4 w-full")}
            >
              {pending ? "Creando pedido…" : sandbox ? "Confirmar pago de prueba" : "Confirmar y pagar"}
            </button>
          </div>
        </aside>
      </form>
    </PageMain>
  );
}
