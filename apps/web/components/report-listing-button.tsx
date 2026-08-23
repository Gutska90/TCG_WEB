"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REPORT_REASONS, REPORT_REASON_LABELS } from "@tcg/config";
import type { ReportReason } from "@tcg/config";
import { ApiError, api } from "../lib/api";
import { userFacingError, loginHref } from "../lib/errors";

export function ReportListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("COUNTERFEIT");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (done) {
    return <p className="mt-4 text-sm text-text-muted">Reporte enviado. Lo revisará el equipo.</p>;
  }

  return (
    <div className="mt-6">
      <button type="button" className="text-sm underline" onClick={() => setOpen(true)}>
        Reportar
      </button>
      {open ? (
        <form
          className="mt-3 grid gap-3 rounded-[16px] border border-border bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            setError(null);
            void api("/v1/reports", {
              method: "POST",
              body: JSON.stringify({
                targetType: "LISTING",
                targetId: listingId,
                reason,
                description: description || undefined,
              }),
            })
              .then(() => setDone(true))
              .catch((err: unknown) => {
                if (err instanceof ApiError && err.status === 401) {
                  router.push(loginHref(`/listings/${listingId}`));
                  return;
                }
                setError(userFacingError(err));
              })
              .finally(() => setPending(false));
          }}
        >
          <label className="text-sm">
            Motivo
            <select
              className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2"
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
            >
              {REPORT_REASONS.map((value) => (
                <option key={value} value={value}>
                  {REPORT_REASON_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Detalle (opcional)
            <textarea
              className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2"
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-white">
              {pending ? "Enviando…" : "Enviar reporte"}
            </button>
            <button type="button" className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-surface px-4 py-2 text-sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
