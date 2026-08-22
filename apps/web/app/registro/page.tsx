"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { LEGAL_CONSENT_CHECKBOX, MARKETING_CONSENT_CHECKBOX } from "@tcg/config";
import { register } from "../../lib/api";
import { userFacingError } from "../../lib/errors";
import { FormError, PageMain, buttonClass } from "../../components/ui-feedback";
import { OauthButtons } from "../../components/oauth-buttons";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        displayName: String(form.get("displayName")),
        acceptTerms: form.get(LEGAL_CONSENT_CHECKBOX.name) === "on",
        marketingOptIn: form.get(MARKETING_CONSENT_CHECKBOX.name) === "on",
      });
      router.push("/me");
    } catch (err) {
      setError(userFacingError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input name="displayName" type="text" required minLength={2} autoComplete="name" className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input name="email" type="email" required autoComplete="email" className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña (mínimo 10 caracteres)
          <input name="password" type="password" required minLength={10} autoComplete="new-password" className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            name={LEGAL_CONSENT_CHECKBOX.name}
            type="checkbox"
            required
            defaultChecked={LEGAL_CONSENT_CHECKBOX.defaultChecked}
            className="mt-1"
          />
          <span>
            {LEGAL_CONSENT_CHECKBOX.label}{" "}
            <Link href="/terminos" className="underline">
              Términos
            </Link>{" "}
            y{" "}
            <Link href="/privacidad" className="underline">
              Privacidad
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-neutral-700">
          <input
            name={MARKETING_CONSENT_CHECKBOX.name}
            type="checkbox"
            defaultChecked={MARKETING_CONSENT_CHECKBOX.defaultChecked}
            className="mt-1"
          />
          <span>{MARKETING_CONSENT_CHECKBOX.label}</span>
        </label>
        <FormError message={error} />
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      <OauthButtons onSuccess={() => router.push("/me")} />
      <p className="mt-6 text-sm text-neutral-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="underline">
          Ingresar
        </Link>
      </p>
    </PageMain>
  );
}
