"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import type { ModerationActionView, Paginated } from "@tcg/types";
import { Pager } from "@/components/filters";
import { ApiError, api } from "@/lib/api";

function Inner() {
  const search = useSearchParams();
  const qs = search?.toString() ?? "";
  const [data, setData] = useState<Paginated<ModerationActionView> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void api<Paginated<ModerationActionView>>(`/v1/admin/moderation/actions${qs ? `?${qs}` : ""}`).then(setData);
  }, [qs]);

  async function post(path: string, reason: string) {
    setError(null);
    setNotice(null);
    await api(path, { method: "POST", body: JSON.stringify({ reason }) });
    setNotice("Acción registrada");
    setData(await api<Paginated<ModerationActionView>>(`/v1/admin/moderation/actions${qs ? `?${qs}` : ""}`));
  }

  function onAction(event: FormEvent<HTMLFormElement>, pathOf: (id: string) => string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = String(form.get("id") ?? "").trim();
    const reason = String(form.get("reason") ?? "").trim();
    void post(pathOf(id), reason).catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : "No se pudo completar");
    });
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Moderación</h1>
        <p className="mt-1 text-sm text-amber-200">
          Pausar o suspender no cancela ventas pagadas ni mueve ledger. Suspender seller es ADMIN / SUPER_ADMIN.
        </p>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      <section className="grid gap-4 sm:grid-cols-2">
        <form className="rounded border border-neutral-800 p-4" onSubmit={(event) => onAction(event, (id) => `/v1/admin/listings/${id}/pause`)}>
          <h2 className="font-medium">Pausar listing</h2>
          <input name="id" required placeholder="listing UUID" className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <textarea name="reason" required minLength={3} className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <button type="submit" className="mt-2 rounded bg-white px-3 py-2 text-sm text-neutral-950">
            Pausar
          </button>
        </form>
        <form className="rounded border border-neutral-800 p-4" onSubmit={(event) => onAction(event, (id) => `/v1/admin/listings/${id}/restore`)}>
          <h2 className="font-medium">Restaurar listing</h2>
          <input name="id" required placeholder="listing UUID" className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <textarea name="reason" required minLength={3} className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <button type="submit" className="mt-2 rounded bg-white px-3 py-2 text-sm text-neutral-950">
            Restaurar
          </button>
        </form>
        <form className="rounded border border-neutral-800 p-4" onSubmit={(event) => onAction(event, (id) => `/v1/admin/sellers/${id}/suspend`)}>
          <h2 className="font-medium">Suspender vendedor</h2>
          <p className="text-xs text-neutral-500">ADMIN / SUPER_ADMIN. No cancela órdenes pagadas. Bloquea listings nuevos, reactivar y payouts nuevos.</p>
          <input name="id" required placeholder="seller UUID" className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <textarea name="reason" required minLength={3} className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <button type="submit" className="mt-2 rounded bg-red-800 px-3 py-2 text-sm">
            Suspender
          </button>
        </form>
        <form className="rounded border border-neutral-800 p-4" onSubmit={(event) => onAction(event, (id) => `/v1/admin/sellers/${id}/restore`)}>
          <h2 className="font-medium">Levantar suspensión</h2>
          <input name="id" required placeholder="seller UUID" className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <textarea name="reason" required minLength={3} className="mt-2 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm" />
          <button type="submit" className="mt-2 rounded bg-white px-3 py-2 text-sm text-neutral-950">
            Restaurar seller
          </button>
        </form>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Acciones recientes</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">Cuándo</th>
              <th>Acción</th>
              <th>Objetivo</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-neutral-800">
                <td className="py-2 text-neutral-400">{row.createdAt.slice(0, 16)}</td>
                <td>{row.actionType}</td>
                <td>
                  {row.targetType} {row.targetId.slice(0, 8)}
                </td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={data?.page ?? 1} pageSize={data?.pageSize ?? 20} total={data?.total ?? 0} />
      </section>
    </div>
  );
}

export default function AdminModerationPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">Cargando…</p>}>
      <Inner />
    </Suspense>
  );
}
