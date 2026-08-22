"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS } from "@tcg/config";
import type { DisputeDetailView, DisputeMessageView } from "@tcg/types";
import { ApiError, api } from "../../../../lib/api";

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<DisputeDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api<DisputeDetailView>(`/v1/disputes/${id}`)
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/ingresar");
        else setError(err instanceof ApiError ? err.message : "No se pudo cargar");
      });
  }, [id, router]);

  if (error && !data) return <main className="px-6 py-12 text-red-700">{error}</main>;
  if (!data) return <main className="px-6 py-12 text-neutral-500">Cargando…</main>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm">
        <Link href="/me/disputas" className="underline">
          Reclamos
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{data.orderNumber}</h1>
      <p className="mt-1 text-neutral-600">
        {DISPUTE_REASON_LABELS[data.reason]} · {DISPUTE_STATUS_LABELS[data.status]}
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Comprador: {data.buyer.displayName} · Vendedor: {data.seller.displayName}
      </p>
      <p className="mt-2 text-sm">
        <Link href={`/me/compras/${data.orderId}`} className="underline">
          Orden (comprador)
        </Link>
        {" · "}
        <Link href={`/me/ventas/${data.orderId}`} className="underline">
          Orden (vendedor)
        </Link>
        {" · "}
        <Link href="/ayuda" className="underline">
          Ayuda
        </Link>
      </p>
      <ul className="mt-6 grid gap-3">
        {data.messages.map((row) => (
          <li key={row.id} className="rounded border p-3 text-sm">
            <p className="text-xs text-neutral-500">
              {row.author.displayName} · {row.createdAt.slice(0, 16)}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{row.body}</p>
          </li>
        ))}
      </ul>
      <ul className="mt-4 text-sm text-neutral-600">
        {data.evidence.map((row) => (
          <li key={row.id}>
            Evidencia {row.evidenceType} · {row.mime}
          </li>
        ))}
      </ul>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {["RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"].includes(data.status) ? (
        <p className="mt-6 text-sm text-neutral-600">{data.resolution ?? "Reclamo cerrado."}</p>
      ) : (
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            void api<DisputeMessageView>(`/v1/disputes/${id}/messages`, {
              method: "POST",
              body: JSON.stringify({ body }),
            })
              .then((message) => {
                setData({ ...data, messages: [...data.messages, message] });
                setBody("");
              })
              .catch((err: unknown) => {
                setError(err instanceof ApiError ? err.message : "No se pudo enviar");
              })
              .finally(() => setPending(false));
          }}
        >
          <textarea
            className="rounded border px-3 py-2 text-sm"
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            placeholder="Escribe un mensaje"
          />
          <button type="submit" disabled={pending} className="w-fit rounded bg-black px-4 py-2 text-sm text-white">
            {pending ? "Enviando…" : "Enviar mensaje"}
          </button>
        </form>
      )}
    </main>
  );
}
