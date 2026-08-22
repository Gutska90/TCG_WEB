"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, formatClp, formatReputation } from "@tcg/config";
import type { ListingView, Paginated, VariantView } from "@tcg/types";
import { ApiError, api } from "../lib/api";
import { AddToCartButton } from "./add-to-cart-button";
import { AddToCollectionButton } from "./add-to-collection";
import { AddToWishlistButton } from "./add-to-wishlist";
import { PriceHistory } from "./price-history";

export function CardActions({
  variantId,
  variants,
}: {
  variantId: string;
  variants: VariantView[];
}) {
  const [current, setCurrent] = useState(variantId);
  const [message, setMessage] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingView[]>([]);

  useEffect(() => {
    api<Paginated<ListingView>>(`/v1/listings?variantId=${current}&pageSize=40`)
      .then((data) => setListings(data.items))
      .catch(() => setListings([]));
  }, [current]);

  async function toggleFavorite() {
    setMessage(null);
    try {
      await api(`/v1/me/favorites/${current}`, { method: "PUT" });
      setMessage("Guardada en favoritos.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMessage("Ingresa para guardar favoritos.");
        return;
      }
      setMessage(error instanceof ApiError ? error.message : "No se pudo guardar");
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {variants.length > 1 ? (
        <label className="text-sm">
          Variante
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.language} · {variant.finish}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex flex-wrap gap-3">
      <AddToCollectionButton variantId={current} />
        <AddToWishlistButton variantId={current} />
        <button type="button" onClick={() => void toggleFavorite()} className="w-fit rounded border px-4 py-2 text-sm">
          Guardar en favoritos
        </button>
        <Link href={`/vender?variantId=${current}`} className="w-fit rounded border px-4 py-2 text-sm">
          Vender esta
        </Link>
      </div>
      {message ? <p className="text-sm text-neutral-600">{message}</p> : null}
      <PriceHistory variantId={current} />
      <h2 className="mt-6 text-lg font-medium">Vendedores</h2>
      {listings.length === 0 ? (
        <p className="text-sm text-neutral-500">Nadie publica esta variante aún.</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {listings.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 rounded border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <Link href={`/vendedores/${item.seller.slug}`} className="underline">
                  {item.seller.displayName}
                </Link>{" "}
                · {formatReputation(item.seller.reputation.averageStars, item.seller.reputation.count)} ·{" "}
                {item.condition} · {CARD_CONDITION_LABELS[item.condition]}
              </span>
              <span className="flex items-center gap-3">
                <Link href={`/listings/${item.id}`} className="font-medium">
                  {formatClp(item.priceClp)}
                </Link>
                <AddToCartButton listingId={item.id} available={item.available} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
