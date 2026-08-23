"use client";

import { useState } from "react";
import { CARD_CONDITION_LABELS, CARD_CONDITIONS } from "@tcg/config";
import type { CardCondition } from "@tcg/config";
import type { CollectionItemView } from "@tcg/types";
import { ApiError, api } from "../lib/api";
import { track } from "../lib/analytics";
import { buttonClassName } from "./ui/button-styles";
import { controlClassName } from "./ui/input";

export function AddToCollectionButton({
  variantId,
  defaultCondition = "NM",
  defaultQuantity = 1,
  defaultPriceClp,
  label = "Agregar a colección",
}: {
  variantId: string;
  defaultCondition?: CardCondition;
  defaultQuantity?: number;
  defaultPriceClp?: number;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<CardCondition>(defaultCondition);
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [purchasePriceClp, setPurchasePriceClp] = useState(
    defaultPriceClp != null ? String(defaultPriceClp) : "",
  );
  const [purchasedAt, setPurchasedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      await api<CollectionItemView>("/v1/me/collection/items", {
        method: "POST",
        body: JSON.stringify({
          variantId,
          condition,
          quantity,
          ...(purchasePriceClp.trim() ? { purchasePriceClp: Number(purchasePriceClp) } : {}),
          ...(purchasedAt ? { purchasedAt } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      track("collection_item_added", { quantity });
      setOpen(false);
      setMessage("Agregada a tu colección.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMessage("Ingresa para agregar a tu colección.");
      } else if (error instanceof ApiError && error.code === "FEATURE_DISABLED") {
        setMessage("Colecciones no está habilitado.");
      } else {
        setMessage(error instanceof ApiError ? error.message : "No se pudo agregar.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" className={buttonClassName("secondary")} onClick={() => setOpen(true)}>
        {label}
      </button>
      {message ? <p className="mt-2 text-sm text-text-muted">{message}</p> : null}
      {open ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            role="dialog"
            aria-labelledby="add-collection-title"
            className="w-full max-w-md rounded-[16px] border border-border bg-surface p-4 shadow-[var(--shadow)]"
          >
            <h2 id="add-collection-title" className="text-lg font-semibold">
              Agregar a colección
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              <label>
                Condición
                <select
                  className={`mt-1 ${controlClassName}`}
                  value={condition}
                  onChange={(event) => setCondition(event.target.value as CardCondition)}
                >
                  {CARD_CONDITIONS.map((code) => (
                    <option key={code} value={code}>
                      {code} · {CARD_CONDITION_LABELS[code]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cantidad
                <input
                  type="number"
                  min={1}
                  className={`mt-1 ${controlClassName}`}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
              <label>
                Precio de compra (CLP, opcional)
                <input
                  type="number"
                  min={0}
                  className={`mt-1 ${controlClassName}`}
                  value={purchasePriceClp}
                  onChange={(event) => setPurchasePriceClp(event.target.value)}
                />
              </label>
              <label>
                Fecha de compra (opcional)
                <input
                  type="date"
                  className={`mt-1 ${controlClassName}`}
                  value={purchasedAt}
                  onChange={(event) => setPurchasedAt(event.target.value)}
                />
              </label>
              <label>
                Notas (opcional)
                <textarea
                  className={`mt-1 ${controlClassName}`}
                  value={notes}
                  maxLength={500}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className={buttonClassName("primary")}
                disabled={pending}
                onClick={() => void submit()}
              >
                {pending ? "Guardando…" : "Guardar en colección"}
              </button>
              <button type="button" className={buttonClassName("secondary")} onClick={() => setOpen(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
