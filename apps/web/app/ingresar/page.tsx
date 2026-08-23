"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { ApiError, login } from "../../lib/api";
import { userFacingError } from "../../lib/errors";
import { FormError, PageMain, buttonClass } from "../../components/ui-feedback";
import { OauthButtons } from "../../components/oauth-buttons";
import { safeInternalPath } from "@tcg/config";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = safeInternalPath(search.get("next")) ?? "/me";
  const expired = search.get("reason") === "expired";
  const [error, setError] = useState<string | null>(expired ? "Tu sesión expiró. Vuelve a ingresar." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      router.push(next);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Email o contraseña incorrectos." : userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <PageMain width="md">
      <h1 className="text-2xl font-semibold">Ingresar</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm" htmlFor="email">
          Email
          <input id="email" name="email" type="email" required autoComplete="email" className="rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="password">
          Contraseña
          <input id="password" name="password" type="password" required autoComplete="current-password" className="rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <FormError message={error} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
      <OauthButtons onSuccess={() => router.push(next)} />
      <p className="mt-6 text-sm text-text-muted">
        <Link href="/recuperar-password" className="underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
      <p className="mt-3 text-sm text-text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="underline">
          Crear cuenta
        </Link>
      </p>
      <p className="mt-3 text-sm text-text-muted">
        Al ingresar aplican los{" "}
        <Link href="/terminos" className="underline">
          Términos
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="underline">
          Política de Privacidad
        </Link>
        .
      </p>
    </PageMain>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageMain>Cargando…</PageMain>}>
      <LoginForm />
    </Suspense>
  );
}
