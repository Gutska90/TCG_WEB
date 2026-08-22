"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISPUTE_REASONS, DISPUTE_REASON_LABELS } from "@tcg/config";
import type { DisputeReason } from "@tcg/config";
import type { DisputeDetailView } from "@tcg/types";
import { api } from "../lib/api";
import { userFacingError } from "../lib/errors";

export function OpenDisputeForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState<DisputeReason>("ITEM_NOT_RECEIVED");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 grid gap-3 rounded border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        void api<DisputeDetailView>(`/v1/orders/${orderId}/disputes`, {
          method: "POST",
          body: JSON.stringify({ reason, description: description || undefined }),
        })
          .then((row) => router.push(`/me/disputas/${row.id}`))
          .catch((err: unknown) => {
            setError(userFacingError(err));
          })
          .finally(() => setPending(false));
      }}
    >
      <h2 className="font-medium">Abrir reclamo</h2>
      <p className="text-sm text-neutral-600">Un reclamo no reembolsa solo. El staff revisa la evidencia.</p>
      <label className="text-sm">
        Motivo
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={reason}
          onChange={(event) => setReason(event.target.value as DisputeReason)}
        >
          {DISPUTE_REASONS.map((value) => (
            <option key={value} value={value}>
              {DISPUTE_REASON_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Detalle (opcional)
        <textarea
          className="mt-1 w-full rounded border px-3 py-2"
          value={description}
          maxLength={2000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={pending} className="w-fit rounded border px-4 py-2 text-sm">
        {pending ? "Enviando…" : "Abrir reclamo"}
      </button>
    </form>
  );
}
