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
import { buttonClassName } from "./ui/button-styles";
import { controlClassName } from "./ui/input";

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
    <div className="mt-6 flex flex-col gap-4">
      {variants.length > 1 ? (
        <label className="text-sm">
          Idioma / finish
          <select
            className={`mt-1 ${controlClassName}`}
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
        <button type="button" onClick={() => void toggleFavorite()} className={buttonClassName("ghost")}>
          Guardar en favoritos
        </button>
        <Link href={`/vender?variantId=${current}`} className={buttonClassName("secondary")}>
          Vender esta
        </Link>
      </div>
      {message ? <p className="text-sm text-text-muted">{message}</p> : null}
      <PriceHistory variantId={current} />
      <h2 className="mt-4 text-xl font-medium tracking-tight">Publicaciones</h2>
      {listings.length === 0 ? (
        <p className="text-sm text-text-muted">Nadie publica esta variante aún.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-text-muted uppercase">
                <tr>
                  <th className="py-2 pr-3 font-medium">Condition</th>
                  <th className="py-2 pr-3 font-medium">Seller</th>
                  <th className="py-2 pr-3 font-medium">Rating</th>
                  <th className="py-2 pr-3 font-medium">Shipping</th>
                  <th className="py-2 pr-3 font-medium">Price</th>
                  <th className="py-2 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="py-3 pr-3 font-medium">{item.condition}</td>
                    <td className="py-3 pr-3">
                      <Link href={`/vendedores/${item.seller.slug}`} className="underline underline-offset-2">
                        {item.seller.displayName}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-text-muted">
                      {formatReputation(item.seller.reputation.averageStars, item.seller.reputation.count)}
                    </td>
                    <td className="py-3 pr-3 text-text-muted">
                      {item.allowsShipping ? "Envío" : "Sin envío"}
                      {item.allowsMeetup ? " · Encuentro" : ""}
                    </td>
                    <td className="py-3 pr-3 font-medium tabular-nums">
                      <Link href={`/listings/${item.id}`}>{formatClp(item.priceClp)}</Link>
                    </td>
                    <td className="py-3">
                      <AddToCartButton listingId={item.id} available={item.available} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {listings.map((item) => (
              <li key={item.id} className="rounded-[16px] border border-border bg-surface p-4">
                <p className="text-xs font-medium tracking-wide text-text-muted uppercase">{item.condition}</p>
                <p className="mt-1 font-medium">
                  <Link href={`/vendedores/${item.seller.slug}`} className="underline underline-offset-2">
                    {item.seller.displayName}
                  </Link>{" "}
                  <span className="text-sm font-normal text-text-muted">
                    {formatReputation(item.seller.reputation.averageStars, item.seller.reputation.count)}
                  </span>
                </p>
                <p className="mt-2 text-xl font-medium tabular-nums">
                  <Link href={`/listings/${item.id}`}>{formatClp(item.priceClp)}</Link>
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {item.allowsShipping ? "Envío" : "Sin envío"}
                  {item.allowsMeetup ? " · Encuentro" : ""} · {CARD_CONDITION_LABELS[item.condition]}
                </p>
                <div className="mt-3">
                  <AddToCartButton listingId={item.id} available={item.available} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
