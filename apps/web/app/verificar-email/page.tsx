"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { api } from "../../lib/api";
import { userFacingError } from "../../lib/errors";
import { FormError, PageMain, SuccessNote, buttonClass } from "../../components/ui-feedback";

function VerifyForm() {
  const search = useSearchParams();
  const preset = search.get("token") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/v1/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: String(form.get("token")) }),
      });
      setMessage("Email verificado. Ya puedes comprar y vender.");
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">Verificar email</h1>
      <p className="mt-2 text-sm text-text-muted">Pega el token del correo de verificación. En beta local también puedes pedirlo de nuevo desde tu perfil.</p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Token
          <input name="token" required defaultValue={preset} autoComplete="off" className="rounded border border-border px-3 py-2" />
        </label>
        <FormError message={error} />
        <SuccessNote message={message} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Verificando…" : "Verificar"}
        </button>
      </form>
      {message ? (
        <p className="mt-6 text-sm">
          <Link href="/ingresar" className="underline">
            Ingresar
          </Link>
        </p>
      ) : null}
    </PageMain>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageMain>Cargando…</PageMain>}>
      <VerifyForm />
    </Suspense>
  );
}
