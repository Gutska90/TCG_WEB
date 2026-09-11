"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CARD_CONDITION_LABELS,
  CARD_CONDITIONS,
  CARD_FINISH_LABELS,
  CARD_LANGUAGE_LABELS,
  formatClp,
  formatReputation,
} from "@tcg/config";
import type { ListingView, Paginated, VariantView } from "@tcg/types";
import { ApiError, api } from "../lib/api";
import { AddToCollectionButton } from "./add-to-collection";
import { AddToWishlistButton } from "./add-to-wishlist";
import { PriceHistory } from "./price-history";
import { ListingOfferCard } from "./listing-offer-card";
import { ListingPurchaseActions } from "./listing-purchase-actions";
import { buttonClassName } from "./ui/button-styles";
import { controlClassName } from "./ui/input";
import { EmptyState } from "./ui/empty-state";

export function CardActions({
  variantId,
  variants,
  cardName,
  setName,
}: {
  variantId: string;
  variants: VariantView[];
  cardName: string;
  setName: string;
}) {
  const [current, setCurrent] = useState(variantId);
  const [message, setMessage] = useState<string | null>(null);
  const [listings, setListings] = useState<ListingView[]>([]);
  const [condition, setCondition] = useState("");
  const [shipping, setShipping] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams({
      variantId: current,
      pageSize: "40",
      sort: "priceAsc",
    });
    if (condition) params.set("condition", condition);
    if (shipping === "shipping") params.set("allowsShipping", "true");
    if (shipping === "meetup") params.set("allowsMeetup", "true");
    return params.toString();
  }, [current, condition, shipping]);

  useEffect(() => {
    api<Paginated<ListingView>>(`/v1/listings?${query}`)
      .then((data) => setListings(data.items))
      .catch(() => setListings([]));
  }, [query]);

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
          Idioma / acabado
          <select
            className={`mt-1 ${controlClassName}`}
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {CARD_LANGUAGE_LABELS[variant.language]} · {CARD_FINISH_LABELS[variant.finish]}
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
      <h2 className="mt-4 text-xl font-medium tracking-tight">Ofertas</h2>
      <p className="text-xs text-text-muted">
        El precio más bajo publicado no representa necesariamente una venta realizada.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Condición
          <select className={`mt-1 ${controlClassName}`} value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Todas</option>
            {CARD_CONDITIONS.map((code) => (
              <option key={code} value={code}>
                {code} · {CARD_CONDITION_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Entrega
          <select className={`mt-1 ${controlClassName}`} value={shipping} onChange={(e) => setShipping(e.target.value)}>
            <option value="">Todas</option>
            <option value="shipping">Con envío</option>
            <option value="meetup">Encuentro</option>
          </select>
        </label>
      </div>
      {listings.length === 0 ? (
        <EmptyState
          title={`Nadie vende ${cardName} en esta variante aún.`}
          body="Guárdala en tu wishlist para que te avisemos, o publícala tú."
          action={
            <span className="flex flex-wrap justify-center gap-3">
              <AddToWishlistButton variantId={current} />
              <Link href={`/vender?variantId=${current}`} className={buttonClassName("primary")}>
                Vender esta
              </Link>
            </span>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-text-muted uppercase">
                <tr>
                  <th className="py-2 pr-3 font-medium">Condición</th>
                  <th className="py-2 pr-3 font-medium">Vendedor</th>
                  <th className="py-2 pr-3 font-medium">Reputación</th>
                  <th className="py-2 pr-3 font-medium">Entrega</th>
                  <th className="py-2 pr-3 font-medium">Precio</th>
                  <th className="py-2 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {listings.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="py-3 pr-3 font-medium">{CARD_CONDITION_LABELS[item.condition]}</td>
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
                      <div className="flex flex-col items-start gap-2">
                        <ListingPurchaseActions
                          listingId={item.id}
                          available={item.available}
                          whatsapp={
                            item.seller.contactWhatsappEnabled && item.seller.contactWhatsapp
                              ? {
                                  phoneE164: item.seller.contactWhatsapp,
                                  sellerName: item.seller.displayName,
                                  cardName: item.variant.card.name,
                                  setName,
                                  condition: item.condition,
                                  priceClp: item.priceClp,
                                  listingPath: `/listings/${item.id}`,
                                }
                              : null
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {listings.map((item) => (
              <li key={item.id}>
                <ListingOfferCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
