"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { api } from "../../lib/api";
import { userFacingError } from "../../lib/errors";
import { FormError, PageMain, SuccessNote, buttonClass } from "../../components/ui-feedback";

function RecoverForm() {
  const search = useSearchParams();
  const resetToken = search.get("token");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      if (resetToken) {
        await api("/v1/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ token: resetToken, password: String(form.get("password")) }),
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
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">{resetToken ? "Nueva contraseña" : "Recuperar contraseña"}</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {resetToken ? (
          <label className="flex flex-col gap-1 text-sm">
            Contraseña nueva (mínimo 10)
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className="rounded border border-neutral-300 px-3 py-2" />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input name="email" type="email" required autoComplete="email" className="rounded border border-neutral-300 px-3 py-2" />
          </label>
        )}
        <FormError message={error} />
        <SuccessNote message={message} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Enviando…" : "Enviar"}
        </button>
      </form>
      {message && resetToken ? (
        <p className="mt-6 text-sm">
          <Link href="/ingresar" className="underline">
            Ingresar
          </Link>
        </p>
      ) : null}
    </PageMain>
  );
}

export default function RecoverPage() {
  return (
    <Suspense fallback={<PageMain>Cargando…</PageMain>}>
      <RecoverForm />
    </Suspense>
  );
}
