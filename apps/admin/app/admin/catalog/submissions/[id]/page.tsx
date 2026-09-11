"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CATALOG_SUBMISSION_STATUS_LABELS } from "@tcg/config";
import type { AdminCatalogSubmissionView, SetSummaryView } from "@tcg/types";
import { api } from "@/lib/api";

export default function AdminCatalogSubmissionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [row, setRow] = useState<AdminCatalogSubmissionView | null>(null);
  const [sets, setSets] = useState<SetSummaryView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [setMode, setSetMode] = useState<"existing" | "new">("existing");
  const [setId, setSetId] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    void api<AdminCatalogSubmissionView>(`/v1/admin/catalog/submissions/${id}`)
      .then((data) => {
        setRow(data);
        setNotes(data.reviewNotes ?? "");
        if (data.set?.id) {
          setSetMode("existing");
          setSetId(data.set.id);
        } else {
          setSetMode("new");
          setNewSetName(data.proposedSetName ?? "");
        }
        void api<SetSummaryView[]>(`/v1/games/${data.game.slug}/sets`)
          .then(setSets)
          .catch(() => setSets([]));
      })
      .catch(() => setError("No se pudo cargar la solicitud"));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(path: string, body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const next = await api<AdminCatalogSubmissionView>(`/v1/admin/catalog/submissions/${id}/${path}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setRow(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setPending(false);
    }
  }

  function approve() {
    if (setMode === "existing") {
      void action("approve", { reviewNotes: notes, setId });
      return;
    }
    void action("approve", { reviewNotes: notes, createNewSet: true, newSetName: newSetName.trim() });
  }

  const canApprove =
    !pending && (setMode === "existing" ? Boolean(setId) : Boolean(newSetName.trim()));

  if (!row) return <p className="text-sm text-neutral-400">{error ?? "Cargando…"}</p>;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p>
        <Link href="/admin/catalog/submissions" className="underline">
          Solicitudes
        </Link>
      </p>
      <h1 className="text-xl font-semibold">{row.name}</h1>
      <p className="text-neutral-400">
        {CATALOG_SUBMISSION_STATUS_LABELS[row.status]} · {row.game.name} · {row.set?.name ?? row.proposedSetName ?? "sin edición"} · #
        {row.number ?? "—"} · {row.rarity ?? "—"}
      </p>
      <p>Tipo: {row.supertype ?? "—"}</p>
      <p>Usuario: {row.submittedBy.displayName} ({row.submittedBy.slug})</p>
      <p>Fecha: {row.createdAt}</p>
      {row.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.imageUrl} alt="" className="max-w-xs rounded border border-neutral-800" />
      ) : null}
      {row.sourceUrl ? (
        <p>
          Fuente:{" "}
          <a className="underline" href={row.sourceUrl} rel="noreferrer" target="_blank">
            {row.sourceUrl}
          </a>
        </p>
      ) : null}
      <p className="whitespace-pre-wrap">{row.notes ?? "Sin comentarios"}</p>
      <pre className="overflow-auto rounded border border-neutral-800 p-3">{JSON.stringify(row.attributes, null, 2)}</pre>
      {row.possibleDuplicates.length > 0 ? (
        <div className="rounded border border-yellow-800 p-3">
          <p className="font-medium">Posible duplicado:</p>
          <ul className="mt-2">
            {row.possibleDuplicates.map((item) => (
              <li key={item.id}>
                {item.name} — {item.setName} — #{item.number}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {row.approvedCard ? (
        <p>
          Carta creada: {row.approvedCard.gameSlug}/{row.approvedCard.setSlug}/{row.approvedCard.slug}
        </p>
      ) : null}
      <fieldset className="rounded border border-neutral-800 p-3">
        <legend className="px-1 font-medium">Edición canónica</legend>
        <p className="text-neutral-400">
          Edición propuesta: {row.set?.name ?? row.proposedSetName ?? "sin nombre"}
        </p>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="radio"
            name="setMode"
            checked={setMode === "existing"}
            onChange={() => setSetMode("existing")}
          />
          <span className="flex-1">
            Usar edición existente
            <select
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={setId}
              onChange={(event) => {
                setSetMode("existing");
                setSetId(event.target.value);
              }}
            >
              <option value="">Selecciona</option>
              {sets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="radio"
            name="setMode"
            checked={setMode === "new"}
            onChange={() => setSetMode("new")}
          />
          <span className="flex-1">
            Crear edición nueva
            <input
              className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
              value={newSetName}
              onChange={(event) => {
                setSetMode("new");
                setNewSetName(event.target.value);
              }}
            />
          </span>
        </label>
      </fieldset>
      <label>
        Notas de revisión
        <textarea
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 p-2"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      {error ? <p className="text-red-400">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canApprove} className="rounded border border-neutral-600 px-3 py-2" onClick={() => approve()}>
          Aprobar
        </button>
        <button type="button" disabled={pending} className="rounded border border-neutral-600 px-3 py-2" onClick={() => void action("reject", { reviewNotes: notes || "Rechazada" })}>
          Rechazar
        </button>
        <button type="button" disabled={pending} className="rounded border border-neutral-600 px-3 py-2" onClick={() => void action("duplicate", { reviewNotes: notes })}>
          Marcar duplicado
        </button>
        <button type="button" disabled={pending} className="rounded border border-neutral-600 px-3 py-2" onClick={() => void action("needs-info", { reviewNotes: notes || "Necesitamos más datos" })}>
          Solicitar información
        </button>
      </div>
    </div>
  );
}
