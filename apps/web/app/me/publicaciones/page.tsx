"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CARD_CONDITION_LABELS, LISTING_STATUS_LABELS, formatClp } from "@tcg/config";
import type { ListingView, Paginated } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { userFacingError, loginHref } from "../../../lib/errors";
import { EmptyState, FormError, LoadingBlock, PageMain, SuccessNote, buttonSecondaryClass } from "../../../components/ui-feedback";

export default function MyListingsPage() {
  const router = useRouter();
  const [data, setData] = useState<Paginated<ListingView> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function load() {
    api<Paginated<ListingView>>("/v1/me/listings")
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginHref("/me/publicaciones"));
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          router.replace("/me/vendedor");
          return;
        }
        setError(userFacingError(err));
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function act(id: string, action: "pause" | "activate" | "delete") {
    setPendingId(id);
    setError(null);
    setNotice(null);
    try {
      if (action === "delete") {
        await api(`/v1/listings/${id}`, { method: "DELETE" });
        setNotice("Publicación cancelada.");
      } else {
        await api(`/v1/listings/${id}/${action}`, { method: "POST" });
        setNotice(action === "pause" ? "Publicación pausada." : "Publicación reactivada.");
      }
      load();
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPendingId(null);
    }
  }

  if (error && !data) {
    return (
      <PageMain width="lg">
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!data) {
    return (
      <PageMain width="lg">
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain width="lg">
      <h1 className="text-2xl font-semibold">Mis publicaciones</h1>
      <p className="mt-2 text-sm">
        <Link href="/vender" className="underline">
          Crear publicación
        </Link>
      </p>
      <FormError message={error} />
      <SuccessNote message={notice} />
      {data.items.length === 0 ? (
        <EmptyState>
          Aún no publicas.{" "}
          <Link href="/vender" className="underline">
            Vender una carta
          </Link>
        </EmptyState>
      ) : (
        <ul className="mt-8 grid gap-3">
          {data.items.map((item) => (
            <li key={item.id} className="rounded-[16px] border border-border bg-surface p-4">
              <Link href={`/listings/${item.id}`} className="font-medium underline">
                {item.title}
              </Link>
              <p className="mt-1 text-sm text-text-muted">
                {LISTING_STATUS_LABELS[item.status]} · {item.condition} · {CARD_CONDITION_LABELS[item.condition]} ·{" "}
                {formatClp(item.priceClp)}
              </p>
              <p className="text-sm text-text-muted">
                Stock {item.available} disponible / {item.quantity} total (reservadas {item.quantityReserved}) ·{" "}
                {item.allowsMeetup ? "encuentro" : ""} {item.allowsShipping ? "envío" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Link href={`/me/publicaciones/${item.id}`} className={buttonSecondaryClass}>
                  Editar
                </Link>
                {item.status === "ACTIVE" ? (
                  <button type="button" disabled={pendingId === item.id} className={buttonSecondaryClass} onClick={() => void act(item.id, "pause")}>
                    Pausar
                  </button>
                ) : null}
                {item.status === "PAUSED" ? (
                  <button type="button" disabled={pendingId === item.id} className={buttonSecondaryClass} onClick={() => void act(item.id, "activate")}>
                    Reactivar
                  </button>
                ) : null}
                <button type="button" disabled={pendingId === item.id} className={buttonSecondaryClass} onClick={() => void act(item.id, "delete")}>
                  Cancelar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageMain>
  );
}
