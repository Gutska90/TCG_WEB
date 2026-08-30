"use client";

import { useState } from "react";
import type { AdminCardAttributesView } from "@tcg/types";
import { api } from "@/lib/api";

export default function AdminCatalogAttributesPage() {
  const [cardId, setCardId] = useState("");
  const [data, setData] = useState<AdminCardAttributesView | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Atributos de carta</h1>
      <p className="mb-4 text-sm text-text-muted">Inspección de Card.attributes. No hay edición de JSON.</p>
      <form
        className="mb-6 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          void api<AdminCardAttributesView>(`/v1/admin/catalog/cards/${cardId}/attributes`)
            .then(setData)
            .catch((err: unknown) => setError(err instanceof Error ? err.message : "Error"));
        }}
      >
        <input
          value={cardId}
          onChange={(event) => setCardId(event.target.value)}
          placeholder="UUID de carta"
          className="min-w-80 rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
        <button type="submit" className="rounded border border-neutral-600 px-3 py-2 text-sm">
          Inspeccionar
        </button>
      </form>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {data ? (
        <div className="grid gap-4 text-sm">
          <p>
            {data.gameSlug} · válido: {data.valid ? "sí" : "no"}
          </p>
          <p>Unknown: {data.unknownKeys.join(", ") || "—"}</p>
          {data.issues.length ? (
            <ul>
              {data.issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  {issue.path}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
          <pre className="overflow-auto rounded border border-neutral-800 p-3">{JSON.stringify(data.raw, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
