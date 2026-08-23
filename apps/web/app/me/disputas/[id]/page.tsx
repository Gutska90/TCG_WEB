"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DISPUTE_EVIDENCE_TYPES, DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS } from "@tcg/config";
import type { DisputeDetailView, DisputeEvidenceView, DisputeMessageView } from "@tcg/types";
import { ApiError, api, openAuthenticatedFile } from "../../../../lib/api";
import { uploadUserFile } from "../../../../lib/files";

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

  if (error && !data) return <main className="px-6 py-12 text-danger">{error}</main>;
  if (!data) return <main className="px-6 py-12 text-text-muted">Cargando…</main>;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm">
        <Link href="/me/disputas" className="underline">
          Reclamos
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{data.orderNumber}</h1>
      <p className="mt-1 text-text-muted">
        {DISPUTE_REASON_LABELS[data.reason]} · {DISPUTE_STATUS_LABELS[data.status]}
      </p>
      <p className="mt-2 text-sm text-text-muted">
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
          <li key={row.id} className="rounded-[16px] border border-border bg-surface p-3 text-sm">
            <p className="text-xs text-text-muted">
              {row.author.displayName} · {row.createdAt.slice(0, 16)}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{row.body}</p>
          </li>
        ))}
      </ul>
      <ul className="mt-4 text-sm text-text-muted">
        {data.evidence.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="underline"
              onClick={() =>
                void openAuthenticatedFile(`/v1/disputes/${id}/evidence/${row.id}/file`).catch((err: unknown) =>
                  setError(err instanceof ApiError ? err.message : "No se pudo abrir el archivo"),
                )
              }
            >
              Evidencia {row.evidenceType} · {row.mime}
            </button>
          </li>
        ))}
      </ul>
      {["RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"].includes(data.status) ? null : (
        <label className="mt-4 block w-fit inline-flex min-h-11 items-center rounded-[12px] border border-border bg-surface px-4 py-2 text-sm">
          Adjuntar evidencia
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setPending(true);
              setError(null);
              void uploadUserFile(file, "DISPUTE_EVIDENCE")
                .then((fileId) =>
                  api<DisputeEvidenceView>(`/v1/disputes/${id}/evidence`, {
                    method: "POST",
                    body: JSON.stringify({ fileId, evidenceType: DISPUTE_EVIDENCE_TYPES[0] }),
                  }),
                )
                .then((row) => setData({ ...data, evidence: [...data.evidence, row] }))
                .catch((err: unknown) => {
                  setError(err instanceof ApiError ? err.message : "No se pudo adjuntar");
                })
                .finally(() => setPending(false));
            }}
          />
        </label>
      )}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {["RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"].includes(data.status) ? (
        <p className="mt-6 text-sm text-text-muted">{data.resolution ?? "Reclamo cerrado."}</p>
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
            className="rounded-[12px] border border-border bg-surface px-3 py-2 text-sm"
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            placeholder="Escribe un mensaje"
          />
          <button type="submit" disabled={pending} className="inline-flex min-h-11 w-fit items-center rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-white">
            {pending ? "Enviando…" : "Enviar mensaje"}
          </button>
        </form>
      )}
    </main>
  );
}
