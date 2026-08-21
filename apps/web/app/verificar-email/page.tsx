"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { api, ApiError } from "../../lib/api";

function VerifyForm() {
  const search = useSearchParams();
  const preset = search.get("token") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/v1/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: String(form.get("token")) }),
      });
      setMessage("Email verificado. Ya puedes usar la cuenta con normalidad.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo verificar");
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Verificar email</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Token
          <input
            name="token"
            required
            defaultValue={preset}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-green-800">{message}</p> : null}
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Verificar
        </button>
      </form>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16">Cargando…</main>}>
      <VerifyForm />
    </Suspense>
  );
}
