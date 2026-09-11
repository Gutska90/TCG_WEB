"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { Paginated, WishlistItemView } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { userFacingError } from "../../../lib/errors";
import { FormError, LoadingBlock, PageMain } from "../../../components/ui-feedback";
import { Badge } from "../../../components/ui/badge";
import { buttonClassName } from "../../../components/ui/button-styles";
import { CardImage } from "../../../components/ui/product-card";
import { EmptyState } from "../../../components/ui/empty-state";
import { Price } from "../../../components/ui/price";

export default function WishlistPage() {
  const router = useRouter();
  const [page, setPage] = useState<Paginated<WishlistItemView> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    api<Paginated<WishlistItemView>>("/v1/me/wishlist?pageSize=50")
      .then(setPage)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/ingresar?next=/me/wishlist");
          return;
        }
        setError(userFacingError(err));
      });
  }, [router]);

  async function remove(variantId: string) {
    setPending(variantId);
    setError(null);
    try {
      await api(`/v1/me/wishlist/${variantId}`, { method: "DELETE" });
      const next = await api<Paginated<WishlistItemView>>("/v1/me/wishlist?pageSize=50");
      setPage(next);
    } catch (err: unknown) {
      setError(userFacingError(err));
    } finally {
      setPending(null);
    }
  }

  if (error && !page) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!page) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain>
      <h1 className="text-3xl font-medium tracking-tight">Wishlist</h1>
      <p className="mt-2 text-sm text-text-muted">
        Cartas que quieres, con un precio máximo. No es tu colección ni un favorito. Te avisamos si aparece un listing a
        ese precio o menos.
      </p>
      <FormError message={error} />
      {page.items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Tu wishlist está vacía."
            body="Aún no hay cartas en tu wishlist."
            action={
              <Link href="/buscar" className="underline">
                Buscar cartas
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {page.items.map((item) => {
            const diff =
              item.currentMinClp != null ? item.currentMinClp - item.targetPriceClp : null;
            return (
              <li key={item.id} className="rounded-[16px] border border-border bg-surface p-4">
                <div className="flex gap-3">
                  <CardImage src={item.card.imageUrl} alt={item.card.name} variant="thumb" className="h-24 w-[68px] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${item.card.gameSlug}/${item.card.setSlug}/${item.card.slug}`}
                      className="font-medium underline underline-offset-2"
                    >
                      {item.card.name}
                    </Link>
                    {item.hit ? (
                      <p className="mt-1">
                        <Badge tone="success">Objetivo alcanzado</Badge>
                      </p>
                    ) : null}
                    <Price className="mt-2" size="sm" prefix="Objetivo" value={item.targetPriceClp} />
                    <Price
                      className="mt-1"
                      size="sm"
                      prefix="Mercado"
                      value={item.currentMinClp}
                    />
                    {diff != null ? (
                      <p className="mt-1 text-xs text-text-muted">
                        Diferencia {diff > 0 ? "+" : ""}
                        {formatClp(diff)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-text-muted">Sin listings activos</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/${item.card.gameSlug}/${item.card.setSlug}/${item.card.slug}`}
                    className={buttonClassName("primary", "min-h-9 py-1")}
                  >
                    Ver publicación
                  </Link>
                  <button
                    type="button"
                    className={buttonClassName("ghost", "min-h-9 py-1")}
                    disabled={pending === item.variantId}
                    onClick={() => void remove(item.variantId)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageMain>
  );
}
