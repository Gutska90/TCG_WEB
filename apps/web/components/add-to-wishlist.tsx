"use client";

import { useState } from "react";
import { formatClp } from "@tcg/config";
import type { WishlistItemView } from "@tcg/types";
import { ApiError, api } from "../lib/api";
import { track } from "../lib/analytics";

export function AddToWishlistButton({ variantId }: { variantId: string }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    const targetPriceClp = Number(target);
    if (!Number.isInteger(targetPriceClp) || targetPriceClp < 1 || pending) return;
    setPending(true);
    setMessage(null);
    try {
      await api<WishlistItemView>(`/v1/me/wishlist/${variantId}`, {
        method: "PUT",
        body: JSON.stringify({ targetPriceClp }),
      });
      track("wishlist_item_saved", { targetPriceClp });
      setOpen(false);
      setMessage("Guardada en wishlist.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMessage("Ingresa para usar la wishlist.");
      } else if (error instanceof ApiError && error.code === "FEATURE_DISABLED") {
        setMessage("Wishlist no está habilitada.");
      } else {
        setMessage(error instanceof ApiError ? error.message : "No se pudo guardar.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" className="w-fit rounded border px-4 py-2 text-sm" onClick={() => setOpen(true)}>
        Añadir a wishlist
      </button>
      {message ? <p className="mt-2 text-sm text-neutral-600">{message}</p> : null}
      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="dialog" aria-labelledby="wishlist-title" className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
            <h2 id="wishlist-title" className="text-lg font-semibold">
              Precio objetivo
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Te avisamos si aparece un listing activo a ese precio o menos. No es un pedido ni una reserva.
            </p>
            <label className="mt-4 block text-sm">
              Precio máximo (CLP)
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                inputMode="numeric"
                value={target}
                onChange={(event) => setTarget(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <p className="mt-1 text-xs text-neutral-500">{target ? formatClp(Number(target)) : " "}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                disabled={pending || Number(target) < 1}
                onClick={() => void submit()}
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
