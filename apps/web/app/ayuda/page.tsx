"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS, HELP_FAQS, LEGAL } from "@tcg/config";
import { LegalNotice } from "../../components/legal-document";
import { ApiError, api } from "../../lib/api";

export default function HelpPage() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setOk(false);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await api("/v1/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: String(form.get("category")),
          message: String(form.get("message")),
          screen: "/ayuda",
        }),
      });
      setOk(true);
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el feedback");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-prose px-6 py-12 text-text">
      <h1 className="text-3xl font-semibold tracking-tight">Ayuda</h1>
      <p className="mt-2 text-sm text-text-muted">{LEGAL.betaProductNotice}</p>
      <div className="mt-4">
        <LegalNotice />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
        {HELP_FAQS.map((section) => (
          <article key={section.heading} className="mt-6">
            <h3 className="text-lg font-semibold">{section.heading}</h3>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-2 leading-relaxed text-text">
                {paragraph}
              </p>
            ))}
          </article>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Enlaces</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          <li>
            <Link className="underline underline-offset-2" href="/terminos">
              Términos
            </Link>
          </li>
          <li>
            <Link className="underline underline-offset-2" href="/privacidad">
              Privacidad
            </Link>
          </li>
          <li>
            <Link className="underline underline-offset-2" href="/marketplace">
              Reglas del marketplace
            </Link>
          </li>
          <li>
            <Link className="underline underline-offset-2" href="/refunds">
              Reembolsos y cancelaciones
            </Link>
          </li>
        </ul>
        <p className="mt-4 text-sm text-text-muted">
          Contacto:{" "}
          <a className="underline" href={`mailto:${LEGAL.contactEmail}`}>
            {LEGAL.contactEmail}
          </a>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Enviar feedback beta</h2>
        <p className="mt-2 text-sm text-text-muted">
          Cuéntanos un problema o una idea. No envíes contraseñas ni datos de pago.
        </p>
        <form onSubmit={(event) => void onSubmit(event)} className="mt-4 grid gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Categoría
            <select name="category" required className="rounded border border-border px-3 py-2">
              {FEEDBACK_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {FEEDBACK_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Mensaje
            <textarea
              name="message"
              required
              minLength={8}
              rows={5}
              className="rounded border border-border px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {ok ? <p className="text-sm text-success">Gracias. Recibimos tu mensaje.</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 w-fit items-center rounded-[12px] bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar feedback"}
          </button>
        </form>
      </section>
    </main>
  );
}
