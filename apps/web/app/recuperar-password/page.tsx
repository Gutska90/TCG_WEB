"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { api, ApiError } from "../../lib/api";

function RecoverForm() {
  const search = useSearchParams();
  const resetToken = search.get("token");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (resetToken) {
        await api("/v1/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            token: resetToken,
            password: String(form.get("password")),
          }),
        });
        setMessage("Contraseña actualizada. Ya puedes ingresar.");
        return;
      }
      await api("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: String(form.get("email")) }),
      });
      setMessage("Si el email existe, te enviamos instrucciones.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar");
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">
        {resetToken ? "Nueva contraseña" : "Recuperar contraseña"}
      </h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {resetToken ? (
          <label className="flex flex-col gap-1 text-sm">
            Contraseña nueva (mínimo 10)
            <input
              name="password"
              type="password"
              required
              minLength={10}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        )}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-green-800">{message}</p> : null}
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Enviar
        </button>
      </form>
    </main>
  );
}

export default function RecoverPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16">Cargando…</main>}>
      <RecoverForm />
    </Suspense>
  );
}
