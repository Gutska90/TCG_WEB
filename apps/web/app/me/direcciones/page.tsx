"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AddressView } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { ChilePlaceFields } from "../../../components/chile-place-fields";

export default function AddressesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AddressView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AddressView[]>("/v1/me/addresses")
      .then(setRows)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/ingresar");
        else setError(err instanceof ApiError ? err.message : "No se pudo cargar");
      });
  }, [router]);

  async function onSubmit(form: FormData) {
    await api("/v1/me/addresses", {
      method: "POST",
      body: JSON.stringify({
        label: String(form.get("label") ?? "Principal"),
        recipientName: String(form.get("recipientName") ?? ""),
        phone: String(form.get("phone") ?? ""),
        line1: String(form.get("line1") ?? ""),
        comuna: String(form.get("comuna") ?? ""),
        region: String(form.get("region") ?? ""),
      }),
    });
    const next = await api<AddressView[]>("/v1/me/addresses");
    setRows(next);
  }

  if (error) return <main className="px-6 py-12 text-danger">{error}</main>;
  if (!rows) return <main className="px-6 py-12 text-text-muted">Cargando…</main>;

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Direcciones</h1>
      <ul className="mt-6 grid gap-3 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="rounded-[16px] border border-border bg-surface p-3">
            {row.label}: {row.line1}, {row.comuna}
            <button
              type="button"
              className="ml-3 underline"
              onClick={() =>
                void api(`/v1/me/addresses/${row.id}`, { method: "DELETE" }).then(() =>
                  api<AddressView[]>("/v1/me/addresses").then(setRows),
                )
              }
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
      <form action={onSubmit} className="mt-8 grid gap-3">
        <input name="label" placeholder="Etiqueta" className="rounded-[12px] border border-border bg-surface px-3 py-2" defaultValue="Principal" />
        <input name="recipientName" placeholder="Nombre" required className="rounded-[12px] border border-border bg-surface px-3 py-2" />
        <input name="phone" placeholder="Teléfono" required className="rounded-[12px] border border-border bg-surface px-3 py-2" />
        <input name="line1" placeholder="Dirección" required className="rounded-[12px] border border-border bg-surface px-3 py-2" />
        <ChilePlaceFields />
        <button type="submit" className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-surface px-4 py-2 text-sm">
          Agregar
        </button>
      </form>
    </main>
  );
}
