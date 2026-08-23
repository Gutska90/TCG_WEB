"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, formatClp } from "@tcg/config";
import type { CartView } from "@tcg/types";
import { userFacingError } from "../../lib/errors";
import { getCart, putCartItem, removeCartItem } from "../../lib/cart";
import { FormError, LoadingBlock, PageMain } from "../../components/ui-feedback";
import { buttonClassName } from "../../components/ui/button-styles";
import { controlClassName } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";

const ISSUE_COPY: Record<NonNullable<CartView["items"][number]["issue"]>, string> = {
  LISTING_NOT_ACTIVE: "Esta publicación ya no está activa.",
  LISTING_INSUFFICIENT_STOCK: "El stock cambió. Baja la cantidad o quítala.",
  OWN_LISTING: "Es tu publicación; no se incluye en el total.",
};

export default function CartPage() {
  const [cart, setCart] = useState<CartView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    getCart()
      .then(setCart)
      .catch((err: unknown) => {
        setError(userFacingError(err));
      });
  }, []);

  async function changeQty(listingId: string, quantity: number, available: number) {
    setPendingId(listingId);
    setError(null);
    try {
      if (quantity < 1) {
        setCart(await removeCartItem(listingId));
        return;
      }
      setCart(await putCartItem(listingId, Math.min(quantity, available)));
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPendingId(null);
    }
  }

  if (error && !cart) {
    return (
      <PageMain width="lg">
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!cart) {
    return (
      <PageMain width="lg">
        <h1 className="text-3xl font-medium tracking-tight">Carrito</h1>
        <LoadingBlock />
      </PageMain>
    );
  }

  const summary = (
    <div className="rounded-[16px] border border-border bg-surface p-4">
      <h2 className="font-medium">Resumen</h2>
      <dl className="mt-3 grid gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Productos</dt>
          <dd className="tabular-nums">{formatClp(cart.productTotalClp)}</dd>
        </div>
        <div className="flex justify-between text-text-muted">
          <dt>Envíos</dt>
          <dd>Se calcula al pagar</dd>
        </div>
        <div className="mt-2 flex justify-between font-medium">
          <dt>Total productos</dt>
          <dd className="tabular-nums">{formatClp(cart.productTotalClp)}</dd>
        </div>
      </dl>
      {cart.groups.length > 0 ? (
        <Link href="/checkout" className={buttonClassName("primary", "mt-4 w-full")}>
          Ir a pagar
        </Link>
      ) : null}
    </div>
  );

  return (
    <PageMain width="xl">
      <h1 className="text-3xl font-medium tracking-tight">Carrito</h1>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {cart.groups.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Tu carrito está vacío."
            action={
              <Link href="/buscar" className="underline">
                Buscar cartas
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <ul className="grid gap-6">
            {cart.groups.map((group) => (
              <li key={group.seller.id} className="rounded-[16px] border border-border bg-surface p-4">
                <h2 className="font-medium">
                  Vendido por{" "}
                  <Link href={`/vendedores/${group.seller.slug}`} className="underline underline-offset-2">
                    {group.seller.displayName}
                  </Link>
                </h2>
                <ul className="mt-3 grid gap-3">
                  {group.items.map((item) => (
                    <li key={item.listingId} className="rounded-[12px] border border-border p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link href={`/listings/${item.listingId}`} className="font-medium underline underline-offset-2">
                            {item.listing.title}
                          </Link>
                          <p className="mt-1 text-sm text-text-muted">
                            {item.listing.condition} · {CARD_CONDITION_LABELS[item.listing.condition]} ·{" "}
                            {formatClp(item.listing.priceClp)}
                          </p>
                          {item.issue ? (
                            <p className="mt-1 text-sm text-danger">{ISSUE_COPY[item.issue]}</p>
                          ) : null}
                        </div>
                        <p className="text-sm font-medium tabular-nums">{formatClp(item.lineTotalClp)}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-sm">
                        <label>
                          Cantidad
                          <input
                            type="number"
                            min={1}
                            max={item.listing.available}
                            value={item.quantity}
                            disabled={pendingId === item.listingId}
                            onChange={(event) =>
                              void changeQty(
                                item.listingId,
                                Number(event.target.value),
                                item.listing.available,
                              )
                            }
                            className={`ml-2 w-20 ${controlClassName}`}
                          />
                        </label>
                        <button
                          type="button"
                          className="underline underline-offset-2"
                          disabled={pendingId === item.listingId}
                          onClick={() => void changeQty(item.listingId, 0, item.listing.available)}
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-text-muted">
                  Envío: se calcula al pagar · Subtotal {formatClp(group.subtotalClp)}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden lg:sticky lg:top-28 lg:block">{summary}</div>
        </div>
      )}
      {cart.groups.length > 0 ? (
        <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium tabular-nums">{formatClp(cart.productTotalClp)}</p>
            <Link href="/checkout" className={buttonClassName("primary")}>
              Ir a pagar
            </Link>
          </div>
        </div>
      ) : null}
    </PageMain>
  );
}
