"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, CARD_CONDITIONS, CARD_FINISH_LABELS, CARD_LANGUAGE_LABELS, formatClp } from "@tcg/config";
import type { CardCondition } from "@tcg/config";
import type { CollectionItemView } from "@tcg/types";
import { ApiError, api } from "../../../../lib/api";
import { track } from "../../../../lib/analytics";
import { loginHref, userFacingError } from "../../../../lib/errors";
import { FormError, LoadingBlock, PageMain, SuccessNote } from "../../../../components/ui-feedback";
import { buttonClassName } from "../../../../components/ui/button-styles";
import { CardImage } from "../../../../components/ui/product-card";
import { controlClassName } from "../../../../components/ui/input";

export default function CollectionItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const router = useRouter();
  const [item, setItem] = useState<CollectionItemView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [purchasePriceClp, setPurchasePriceClp] = useState("");
  const [purchasedAt, setPurchasedAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    api<CollectionItemView>(`/v1/me/collection/items/${itemId}`)
      .then((row) => {
        setItem(row);
        setQuantity(row.quantity);
        setCondition(row.condition);
        setPurchasePriceClp(row.purchasePriceClp != null ? String(row.purchasePriceClp) : "");
        setPurchasedAt(row.purchasedAt ?? "");
        setNotes(row.notes ?? "");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginHref(`/me/coleccion/${itemId}`));
          return;
        }
        setError(userFacingError(err));
      });
  }, [itemId, router]);

  async function save() {
    if (pending || !item) return;
    setPending(true);
    setError(null);
    try {
      const updated = await api<CollectionItemView>(`/v1/me/collection/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          quantity,
          condition,
          purchasePriceClp: purchasePriceClp.trim() === "" ? null : Number(purchasePriceClp),
          purchasedAt: purchasedAt || null,
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });
      track("collection_item_updated");
      setItem(updated);
      setNotice("Ítem actualizado.");
    } catch (err: unknown) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending || !item) return;
    setPending(true);
    try {
      await api(`/v1/me/collection/items/${item.id}`, { method: "DELETE" });
      track("collection_item_removed");
      router.replace("/me/coleccion");
    } catch (err: unknown) {
      setError(userFacingError(err));
      setPending(false);
    }
  }

  if (error && !item) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!item) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  const sellHref = `/vender?variantId=${item.variantId}&condition=${item.condition}&quantity=${item.quantity}&collectionItemId=${item.id}`;
  const comparable = item.registeredCostClp != null && item.estimatedValueClp != null;
  const pct =
    comparable && item.registeredCostClp
      ? Math.round(((item.estimatedValueClp! - item.registeredCostClp) / item.registeredCostClp) * 100)
      : null;

  return (
    <PageMain>
      <p className="text-sm">
        <Link href="/me/coleccion" className="underline underline-offset-2">
          Colección
        </Link>
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-[120px_1fr]">
        <CardImage
          src={item.variant.card.imageUrl}
          alt={item.variant.card.name}
          name={item.variant.card.name}
          gameSlug={item.variant.card.gameSlug}
          variant="detail"
        />
        <div>
          <h1 className="text-3xl font-medium tracking-tight">{item.variant.card.name}</h1>
          <p className="mt-1 text-text-muted">
            {item.variant.card.setName} · {item.variant.card.number} · {CARD_LANGUAGE_LABELS[item.variant.language]} · {CARD_FINISH_LABELS[item.variant.finish]}
          </p>
          <p className="mt-4 text-sm">Costo: {item.registeredCostClp != null ? formatClp(item.registeredCostClp) : "Sin costo"}</p>
          <p className="text-sm">
            Valor estimado: {item.estimatedValueClp != null ? formatClp(item.estimatedValueClp) : "Sin precio suficiente"}
          </p>
          {pct != null ? (
            <p className={pct >= 0 ? "text-sm text-success" : "text-sm text-danger"}>
              P/L: {pct >= 0 ? "+" : ""}
              {pct}%
            </p>
          ) : (
            <p className="text-sm text-text-muted">P/L: no comparable</p>
          )}
        </div>
      </div>
      <FormError message={error} />
      <SuccessNote message={notice} />
      <div className="mt-6 grid max-w-md gap-3 text-sm">
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
          Precio de compra unitario (CLP)
          <input
            type="number"
            min={0}
            className={`mt-1 ${controlClassName}`}
            value={purchasePriceClp}
            onChange={(event) => setPurchasePriceClp(event.target.value)}
          />
        </label>
        <label>
          Fecha de compra
          <input
            type="date"
            className={`mt-1 ${controlClassName}`}
            value={purchasedAt}
            onChange={(event) => setPurchasedAt(event.target.value)}
          />
        </label>
        <label>
          Notas
          <textarea
            className={`mt-1 ${controlClassName}`}
            value={notes}
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" className={buttonClassName("primary")} disabled={pending} onClick={() => void save()}>
          Guardar cambios
        </button>
        <Link
          href={sellHref}
          className={buttonClassName("secondary")}
          onClick={() => track("collection_sell_clicked")}
        >
          Vender
        </Link>
        <button type="button" className={buttonClassName("danger")} disabled={pending} onClick={() => void remove()}>
          Eliminar
        </button>
      </div>
    </PageMain>
  );
}
