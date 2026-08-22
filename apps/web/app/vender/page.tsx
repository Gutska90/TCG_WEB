"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, CARD_CONDITIONS, formatClp } from "@tcg/config";
import type { CardDetailView, FileUploadView, ListingView, PriceSuggestionView, SearchCardView, VariantDetailView } from "@tcg/types";
import { ApiError, api, fetchMe } from "../../lib/api";

function SellWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetVariant = searchParams.get("variantId");
  const presetCondition = searchParams.get("condition");
  const presetQuantity = searchParams.get("quantity");
  const sourceCollectionItemId = searchParams.get("collectionItemId");
  const [step, setStep] = useState(presetVariant ? 3 : 1);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchCardView[]>([]);
  const [card, setCard] = useState<CardDetailView | null>(null);
  const [variantId, setVariantId] = useState(presetVariant ?? "");
  const [condition, setCondition] = useState<(typeof CARD_CONDITIONS)[number]>(
    CARD_CONDITIONS.includes(presetCondition as (typeof CARD_CONDITIONS)[number])
      ? (presetCondition as (typeof CARD_CONDITIONS)[number])
      : "NM",
  );
  const [quantity, setQuantity] = useState(Math.max(1, Number(presetQuantity) || 1));
  const [priceClp, setPriceClp] = useState(1000);
  const [suggestion, setSuggestion] = useState<PriceSuggestionView | null>(null);
  const [allowsMeetup, setAllowsMeetup] = useState(true);
  const [allowsShipping, setAllowsShipping] = useState(true);
  const [description, setDescription] = useState("");
  const [imageFileIds, setImageFileIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        if (!me.emailVerified) {
          setMessage("Verifica tu email para vender. Ve a tu perfil para reenviar el correo.");
          return;
        }
        if (!me.roles.includes("SELLER") && !me.profile.sellerOnboardedAt) {
          router.replace("/me/vendedor");
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/ingresar");
      });
  }, [router]);

  useEffect(() => {
    if (!presetVariant) return;
    void api<VariantDetailView>(`/v1/variants/${presetVariant}`)
      .then((detail) => {
        setVariantId(detail.variant.id);
        return api<CardDetailView>(`/v1/cards/${detail.variant.card.id}`);
      })
      .then(setCard)
      .catch(() => setMessage("No se pudo cargar la variante."));
  }, [presetVariant]);

  useEffect(() => {
    if (!variantId || step < 4) return;
    void api<PriceSuggestionView>(`/v1/variants/${variantId}/price-suggestion`)
      .then((value) => {
        setSuggestion(value);
        if (value.suggested) setPriceClp(value.suggested);
      })
      .catch(() => setSuggestion(null));
  }, [variantId, step]);

  async function searchCards() {
    setMessage(null);
    const data = await api<{ items: SearchCardView[] }>(`/v1/search/cards?q=${encodeURIComponent(q)}&pageSize=10`);
    setHits(data.items);
    if (data.items.length === 0) setMessage("No encontramos esa carta.");
  }

  async function registerPhoto() {
    const created = await api<FileUploadView>("/v1/files/uploads", {
      method: "POST",
      body: JSON.stringify({ mime: "image/jpeg", size: 1, purpose: "LISTING" }),
    });
    await api(`/v1/files/${created.fileId}/complete`, { method: "POST" });
    setImageFileIds((current) => [...current, created.fileId]);
  }

  async function publish() {
    setMessage(null);
    try {
      const listing = await api<ListingView>("/v1/listings", {
        method: "POST",
        body: JSON.stringify({
          variantId,
          condition,
          quantity,
          priceClp,
          imageFileIds,
          sourceCollectionItemId: sourceCollectionItemId || undefined,
          allowsMeetup,
          allowsShipping,
          description,
        }),
      });
      router.push(`/listings/${listing.id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "SELLER_ONBOARDING_REQUIRED") {
        router.replace("/me/vendedor");
        return;
      }
      setMessage(err instanceof ApiError ? err.message : "No se pudo publicar");
    }
  }

  return (
    <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold">Vender</h1>
      <p className="mt-1 text-sm text-neutral-500">Paso {step} de 6</p>
      {message ? <p className="mt-4 text-sm text-red-700">{message}</p> : null}

      {step === 1 ? (
        <div className="mt-6 grid gap-3">
          <label className="text-sm">
            Buscar carta
            <input className="mt-1 w-full rounded border px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button type="button" className="w-fit rounded border px-4 py-2 text-sm" onClick={() => void searchCards()}>
            Buscar
          </button>
          <ul className="grid gap-2">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="w-full rounded border p-3 text-left"
                  onClick={() => {
                    void api<CardDetailView>(`/v1/cards/${hit.id}`).then((detail) => {
                      setCard(detail);
                      setVariantId(detail.variants.find((row) => row.isDefault)?.id ?? detail.variants[0]?.id ?? "");
                      setStep(2);
                    });
                  }}
                >
                  {hit.name} · {hit.setSlug}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 2 && card ? (
        <div className="mt-6 grid gap-3">
          <p>{card.name}</p>
          <label className="text-sm">
            Variante
            <select className="mt-1 w-full rounded border px-3 py-2" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
              {card.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.language} · {variant.finish}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="w-fit rounded border px-4 py-2 text-sm" onClick={() => setStep(3)}>
            Continuar
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-6 grid gap-3">
          <label className="text-sm">
            Condición
            <select
              className="mt-1 w-full rounded border px-3 py-2"
              value={condition}
              onChange={(e) => setCondition(e.target.value as (typeof CARD_CONDITIONS)[number])}
            >
              {CARD_CONDITIONS.map((code) => (
                <option key={code} value={code}>
                  {code} · {CARD_CONDITION_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="w-fit rounded border px-4 py-2 text-sm" onClick={() => setStep(4)}>
            Continuar
          </button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-6 grid gap-3">
          {suggestion ? (
            <p className="text-sm text-neutral-600">
              Mercado: {suggestion.market ? formatClp(suggestion.market) : "—"} · Mínimo:{" "}
              {suggestion.minListing ? formatClp(suggestion.minListing) : "—"} · Sugerido:{" "}
              {suggestion.suggested ? formatClp(suggestion.suggested) : "—"}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">Aún no hay publicaciones para sugerir precio.</p>
          )}
          <label className="text-sm">
            Cantidad
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-3 py-2"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
          </label>
          <label className="text-sm">
            Precio (CLP)
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-3 py-2"
              value={priceClp}
              onChange={(e) => setPriceClp(Number(e.target.value) || 1)}
            />
          </label>
          <button type="button" className="w-fit rounded border px-4 py-2 text-sm" onClick={() => setStep(5)}>
            Continuar
          </button>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="mt-6 grid gap-3">
          <p className="text-sm text-neutral-600">
            Fotos: se registra el archivo (object storage R2 llega en deploy). Mínimo 1.
          </p>
          <button type="button" className="w-fit rounded border px-4 py-2 text-sm" onClick={() => void registerPhoto()}>
            Registrar foto
          </button>
          <p className="text-sm">{imageFileIds.length} foto(s)</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowsMeetup} onChange={(e) => setAllowsMeetup(e.target.checked)} />
            Retiro / encuentro
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowsShipping} onChange={(e) => setAllowsShipping(e.target.checked)} />
            Envío
          </label>
          <label className="text-sm">
            Descripción
            <textarea className="mt-1 w-full rounded border px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button type="button" className="w-fit rounded border px-4 py-2 text-sm" onClick={() => setStep(6)}>
            Continuar
          </button>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="mt-6 grid gap-3 text-sm">
          <p>
            {card?.name ?? "Carta"} · {condition} · {quantity} × {formatClp(priceClp)}
          </p>
          <button type="button" className="w-fit rounded border px-4 py-2" onClick={() => void publish()}>
            Publicar
          </button>
        </div>
      ) : null}

      {step > 1 ? (
        <button type="button" className="mt-6 text-sm underline" onClick={() => setStep(step - 1)}>
          Volver
        </button>
      ) : (
        <Link href="/" className="mt-6 inline-block text-sm underline">
          Cancelar
        </Link>
      )}
    </main>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={<main className="px-6 py-12 text-neutral-500">Cargando…</main>}>
      <SellWizard />
    </Suspense>
  );
}
