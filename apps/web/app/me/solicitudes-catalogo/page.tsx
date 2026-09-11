"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATALOG_SUBMISSION_STATUS_LABELS } from "@tcg/config";
import type { CatalogSubmissionView, Paginated } from "@tcg/types";
import { ApiError, api, fetchMe } from "../../../lib/api";
import { buttonClassName } from "../../../components/ui/button-styles";

export default function MyCatalogSubmissionsPage() {
  const router = useRouter();
  const [data, setData] = useState<Paginated<CatalogSubmissionView> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe().catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 401) router.replace("/ingresar?next=/me/solicitudes-catalogo");
    });
    void api<Paginated<CatalogSubmissionView>>("/v1/me/catalog-submissions")
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) return;
        setError(err instanceof ApiError ? err.message : "No se pudieron cargar las solicitudes");
      });
  }, [router]);

  if (error) {
    return (
      <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <p className="text-sm text-danger">{error}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <p className="text-sm text-text-muted">Cargando…</p>
      </main>
    );
  }

  return (
    <main id="contenido" className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <p className="text-sm">
        <Link href="/me" className="underline underline-offset-2">
          Mi cuenta
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">Solicitudes de catálogo</h1>
      <p className="mt-2 text-sm text-text-muted">
        Si un administrador pide más datos, completa la solicitud desde aquí.
      </p>
      <p className="mt-4">
        <Link href="/vender/solicitar-carta" className={buttonClassName("secondary")}>
          Solicitar carta nueva
        </Link>
      </p>
      <ul className="mt-6 grid gap-3">
        {data.items.map((row) => (
          <li key={row.id} className="rounded-[16px] border border-border bg-surface p-4 text-sm">
            <Link href={`/me/solicitudes-catalogo/${row.id}`} className="font-medium underline underline-offset-2">
              {row.name}
            </Link>
            <p className="mt-1 text-text-muted">
              {CATALOG_SUBMISSION_STATUS_LABELS[row.status]} · {row.game.name} ·{" "}
              {row.set?.name ?? row.proposedSetName ?? "sin edición"}
            </p>
          </li>
        ))}
      </ul>
      {data.items.length === 0 ? <p className="mt-6 text-sm text-text-muted">Aún no envías solicitudes.</p> : null}
    </main>
  );
}
