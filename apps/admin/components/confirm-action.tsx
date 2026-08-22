"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { ApiError } from "@/lib/api";

export function ConfirmAction({
  title,
  confirmLabel,
  requireReason,
  disabled,
  onConfirm,
}: {
  title: string;
  confirmLabel: string;
  requireReason?: boolean;
  disabled?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    if (requireReason && reason.length < 3) {
      setError("El motivo es obligatorio (mín. 3 caracteres)");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onConfirm(reason);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={disabled || pending}
        className="rounded bg-red-800 px-3 py-2 text-sm disabled:opacity-50"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {title}
      </button>
      {open ? (
        <form onSubmit={onSubmit} className="mt-3 rounded border border-red-900 bg-red-950/40 p-4">
          <p className="text-sm">{confirmLabel}</p>
          {requireReason ? (
            <label className="mt-3 flex flex-col gap-1 text-sm">
              Motivo
              <textarea
                name="reason"
                required
                minLength={3}
                rows={3}
                className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
              />
            </label>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-white px-3 py-2 text-sm text-neutral-950 disabled:opacity-50"
            >
              {pending ? "Procesando…" : "Confirmar"}
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded border border-neutral-600 px-3 py-2 text-sm"
              onClick={() => setOpen(false)}
            >
              Volver
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-neutral-500 uppercase">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
