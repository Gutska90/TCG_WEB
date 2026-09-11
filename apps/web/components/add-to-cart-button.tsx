"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiError } from "../lib/api";
import { getCart, putCartItem } from "../lib/cart";
import { Button } from "./ui/button";

export function AddToCartButton({
  listingId,
  available,
  quantityToAdd = 1,
}: {
  listingId: string;
  available: number;
  quantityToAdd?: number;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const addQty = Math.max(1, quantityToAdd);

  async function add() {
    setMessage(null);
    setPending(true);
    try {
      const cart = await getCart();
      const current = cart.items.find((item) => item.listingId === listingId)?.quantity ?? 0;
      const next = Math.min(current + addQty, available);
      if (next === current) {
        setMessage("No hay más stock de esta publicación.");
        return;
      }
      await putCartItem(listingId, next);
      setMessage("Agregada al carrito.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "No se pudo agregar");
    } finally {
      setPending(false);
    }
  }

  if (available <= 0) {
    return <p className="text-sm text-text-muted">Sin stock</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={() => void add()} disabled={pending} className="w-fit">
        {pending ? "Agregando…" : addQty > 1 ? `Agregar ${addQty} al carrito` : "Agregar al carrito"}
      </Button>
      {message ? (
        <p className="text-sm text-text-muted">
          {message}{" "}
          {message === "Agregada al carrito." ? (
            <Link href="/carrito" className="underline">
              Ver carrito
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
