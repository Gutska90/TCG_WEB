"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { Paginated, WishlistItemView } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { loginHref, userFacingError } from "../../../lib/errors";
import { FormError, LoadingBlock, PageMain } from "../../../components/ui-feedback";

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
          router.replace(loginHref("/me/wishlist"));
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
      <h1 className="text-2xl font-semibold">Wishlist</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Cartas que quieres, con un precio máximo. No es tu colección ni un favorito. Te avisamos si aparece un listing a
        ese precio o menos.
      </p>
      <FormError message={error} />
      {page.items.length === 0 ? (
        <p className="mt-8 text-neutral-600">Aún no hay cartas en tu wishlist.</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {page.items.map((item) => (
            <li key={item.id} className="rounded border p-4 text-sm">
              <Link
                href={`/${item.card.gameSlug}/${item.card.setSlug}/${item.card.slug}`}
                className="font-medium underline"
              >
                {item.card.name}
              </Link>
              <p className="mt-1 text-neutral-600">
                {item.variant.language} · {item.variant.finish} · objetivo {formatClp(item.targetPriceClp)}
              </p>
              <p className="mt-1">
                Precio actual: {item.currentMinClp != null ? formatClp(item.currentMinClp) : "Sin listings activos"}
                {item.hit ? " · Dentro del objetivo" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/${item.card.gameSlug}/${item.card.setSlug}/${item.card.slug}`} className="underline">
                  Ver disponibles
                </Link>
                <button
                  type="button"
                  className="underline disabled:opacity-50"
                  disabled={pending === item.variantId}
                  onClick={() => void remove(item.variantId)}
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageMain>
  );
}
