"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, formatClp } from "@tcg/config";
import type { CartView } from "@tcg/types";
import { userFacingError } from "../../lib/errors";
import { getCart, putCartItem, removeCartItem } from "../../lib/cart";
import { FormError, LoadingBlock, PageMain } from "../../components/ui-feedback";

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
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain width="lg">
      <h1 className="text-2xl font-semibold">Carrito</h1>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {cart.groups.length === 0 ? (
        <p className="mt-6 text-neutral-600">
          Tu carrito está vacío.{" "}
          <Link href="/buscar" className="underline">
            Buscar cartas
          </Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-8">
          {cart.groups.map((group) => (
            <li key={group.seller.id}>
              <h2 className="font-medium">
                <Link href={`/vendedores/${group.seller.slug}`} className="underline">
                  {group.seller.displayName}
                </Link>
              </h2>
              <ul className="mt-3 grid gap-3">
                {group.items.map((item) => (
                  <li key={item.listingId} className="rounded border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link href={`/listings/${item.listingId}`} className="font-medium underline">
                          {item.listing.title}
                        </Link>
                        <p className="mt-1 text-sm text-neutral-600">
                          {item.listing.condition} · {CARD_CONDITION_LABELS[item.listing.condition]} ·{" "}
                          {formatClp(item.listing.priceClp)}
                        </p>
                        {item.issue ? (
                          <p className="mt-1 text-sm text-red-700">{ISSUE_COPY[item.issue]}</p>
                        ) : null}
                      </div>
                      <p className="text-sm">{formatClp(item.lineTotalClp)}</p>
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
                          className="ml-2 w-16 rounded border px-2 py-1"
                        />
                      </label>
                      <button
                        type="button"
                        className="underline"
                        disabled={pendingId === item.listingId}
                        onClick={() => void changeQty(item.listingId, 0, item.listing.available)}
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-neutral-600">Subtotal: {formatClp(group.subtotalClp)}</p>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-10 grid max-w-xs gap-1 text-sm">
        <div className="flex justify-between">
          <dt>Productos</dt>
          <dd>{formatClp(cart.productTotalClp)}</dd>
        </div>
        <div className="flex justify-between text-neutral-500">
          <dt>Envíos</dt>
          <dd>Se calcula al pagar</dd>
        </div>
        <div className="flex justify-between font-medium">
          <dt>Total productos</dt>
          <dd>{formatClp(cart.productTotalClp)}</dd>
        </div>
      </dl>
      {cart.groups.length > 0 ? (
        <p className="mt-8">
          <Link href="/checkout" className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
            Ir a pagar
          </Link>
        </p>
      ) : null}
    </PageMain>
  );
}
