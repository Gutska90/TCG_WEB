"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CollectionSetDetailView } from "@tcg/types";
import { ApiError, api } from "../../../../../lib/api";
import { track } from "../../../../../lib/analytics";
import { loginHref, userFacingError } from "../../../../../lib/errors";
import { FormError, LoadingBlock, PageMain } from "../../../../../components/ui-feedback";
import { buttonClassName } from "../../../../../components/ui/button-styles";
import { CardImage } from "../../../../../components/ui/product-card";
import { ProgressBar } from "../../../../../components/ui/stat-card";

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
        <Link href="/me/coleccion" className="underline underline-offset-2">
          Colección
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-medium tracking-tight">
        {progress.gameName} {progress.setName}
      </h1>
      <p className="mt-2 text-text-muted">
        {progress.ownedUnique} / {progress.total}
      </p>
      <ProgressBar className="mt-3 max-w-md" value={progress.percentage} label={`Progreso ${progress.setName}`} />
      <p className="mt-2 text-sm font-medium tabular-nums">{progress.percentage}%</p>
      <p className="mt-1 text-sm text-text-muted">
        Te faltan {progress.missing} cartas · {progress.extraCopies} duplicadas
        {progress.missingWithActiveListings ? ` · ${progress.missingWithActiveListings} con publicaciones` : ""}
      </p>
      {progress.missing > 0 ? (
        <Link href={marketplaceHref} className={buttonClassName("primary", "mt-4")}>
          Ver cartas faltantes
        </Link>
      ) : (
        <p className="mt-4 text-sm">Set completo en tu colección.</p>
      )}
      <h2 className="mt-8 text-lg font-medium">Faltantes</h2>
      {missing.items.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">No te falta ninguna carta de este set.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {missing.items.map((card) => (
            <li key={card.cardId} className="flex items-center gap-3 rounded-[16px] border border-border bg-surface p-3 text-sm">
              <CardImage src={card.imageUrl} alt="" className="h-20 w-14 shrink-0" />
              <span className="min-w-0 flex-1">
                {card.name} · {card.number}
                {card.hasActiveListing ? " · con publicaciones" : ""}
              </span>
              <Link href={`/${card.gameSlug}/${card.setSlug}/${card.slug}`} className="underline underline-offset-2">
                Ver en marketplace
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageMain>
  );
}
