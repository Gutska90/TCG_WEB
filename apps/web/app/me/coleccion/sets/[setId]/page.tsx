"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CollectionSetDetailView } from "@tcg/types";
import { ApiError, api } from "../../../../../lib/api";
import { track } from "../../../../../lib/analytics";
import { loginHref, userFacingError } from "../../../../../lib/errors";
import { FormError, LoadingBlock, PageMain } from "../../../../../components/ui-feedback";

export default function CollectionSetPage() {
  const { setId } = useParams<{ setId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CollectionSetDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CollectionSetDetailView>(`/v1/me/collection/sets/${setId}?pageSize=40`)
      .then((row) => {
        setDetail(row);
        track("set_progress_viewed");
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginHref(`/me/coleccion/sets/${setId}`));
          return;
        }
        setError(userFacingError(err));
      });
  }, [setId, router]);

  if (error && !detail) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!detail) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  const { progress, missing } = detail;
  const marketplaceHref = `/buscar?q=${encodeURIComponent(progress.setName)}`;

  return (
    <PageMain>
      <p className="text-sm">
        <Link href="/me/coleccion" className="underline">
          Colección
        </Link>
      </p>
      <h1 className="mt-4 text-2xl font-semibold">
        {progress.gameName} {progress.setName}
      </h1>
      <p className="mt-2 text-neutral-600">
        {progress.ownedUnique} / {progress.total} · {progress.percentage}%
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        Te faltan {progress.missing} cartas · {progress.missingWithActiveListings} tienen publicaciones activas ·
        duplicados {progress.extraCopies}
      </p>
      {progress.missing > 0 ? (
        <Link href={marketplaceHref} className="mt-4 inline-block rounded border px-4 py-2 text-sm">
          Ver disponibles
        </Link>
      ) : (
        <p className="mt-4 text-sm">Set completo en tu colección.</p>
      )}
      <h2 className="mt-8 text-lg font-medium">Faltantes</h2>
      {missing.items.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600">No te falta ninguna carta de este set.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {missing.items.map((card) => (
            <li key={card.cardId} className="flex items-center justify-between rounded border p-3 text-sm">
              <span>
                {card.name} · {card.number}
                {card.hasActiveListing ? " · con publicaciones" : ""}
              </span>
              <Link href={`/${card.gameSlug}/${card.setSlug}/${card.slug}`} className="underline">
                Ver en marketplace
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageMain>
  );
}
