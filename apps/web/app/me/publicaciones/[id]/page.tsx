"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, CARD_CONDITIONS, formatClp } from "@tcg/config";
import type { FeePreviewView, ListingView } from "@tcg/types";
import { ApiError, api } from "../../../../lib/api";
import { previewSellerFee } from "../../../../lib/seller-plans";
import { userFacingError, loginHref } from "../../../../lib/errors";
import { FormError, LoadingBlock, PageMain, SuccessNote, buttonClass } from "../../../../components/ui-feedback";

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<ListingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [priceClp, setPriceClp] = useState<number | null>(null);
  const [feePreview, setFeePreview] = useState<FeePreviewView | null>(null);

  useEffect(() => {
    api<ListingView>(`/v1/listings/${id}`)
      .then((row) => {
        setListing(row);
        setPriceClp(row.priceClp);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace(loginHref(`/me/publicaciones/${id}`));
        else setError(userFacingError(err));
      });
  }, [id, router]);

  useEffect(() => {
    const amount = priceClp ?? listing?.priceClp ?? 0;
    if (amount < 1) return;
    void previewSellerFee(amount)
      .then(setFeePreview)
      .catch(() => setFeePreview(null));
  }, [priceClp, listing?.priceClp]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listing) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await api<ListingView>(`/v1/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          condition: String(form.get("condition")),
          quantity: Number(form.get("quantity")),
          priceClp: Number(form.get("priceClp")),
          allowsMeetup: form.get("allowsMeetup") === "on",
          allowsShipping: form.get("allowsShipping") === "on",
          description: String(form.get("description") ?? ""),
        }),
      });
      setListing(next);
      setNotice("Publicación actualizada.");
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  if (error && !listing) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!listing) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain>
      <p className="text-sm">
        <Link href="/me/publicaciones" className="underline">
          Publicaciones
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Editar publicación</h1>
      <p className="mt-1 text-sm text-text-muted">
        {listing.title} · stock disponible {listing.available} · {formatClp(listing.priceClp)}
      </p>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 grid gap-3">
        <label className="text-sm">
          Condición
          <select name="condition" defaultValue={listing.condition} className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2">
            {CARD_CONDITIONS.map((value) => (
              <option key={value} value={value}>
                {value} · {CARD_CONDITION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Cantidad
          <input name="quantity" type="number" min={1} defaultValue={listing.quantity} className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <label className="text-sm">
          Precio CLP
          <input
            name="priceClp"
            type="number"
            min={1}
            value={priceClp ?? listing.priceClp}
            onChange={(event) => setPriceClp(Number(event.target.value) || 1)}
            className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2"
          />
        </label>
        {feePreview ? (
          <p className="text-sm text-text-muted">
            Comisión estimada ({feePreview.plan}): {formatClp(feePreview.feeClp)}. Recibirías antes del costo del medio de
            pago: {formatClp(feePreview.payableBeforeProcessorClp)}. El costo del medio de pago se calcula por separado.
            {feePreview.promotionCode
              ? ` Promoción ${feePreview.promotionCode}. Tarifa normal del plan: ${feePreview.normalFeeBps / 100}%.`
              : null}
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input name="allowsMeetup" type="checkbox" defaultChecked={listing.allowsMeetup} />
          Encuentro
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="allowsShipping" type="checkbox" defaultChecked={listing.allowsShipping} />
          Envío
        </label>
        <label className="text-sm">
          Descripción
          <textarea name="description" defaultValue={listing.description} maxLength={2000} className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <FormError message={error} />
        <SuccessNote message={notice} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </PageMain>
  );
}
