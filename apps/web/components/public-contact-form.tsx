"use client";

import { useEffect, useState } from "react";
import { ApiError, api, fetchMe } from "../lib/api";
import type { MeView } from "@tcg/types";
import { buttonClassName } from "./ui/button-styles";
import { controlClassName } from "./ui/input";

export function PublicContactForm({ me }: { me: MeView }) {
  const [phone, setPhone] = useState(me.profile.contactWhatsapp ?? "");
  const [enabled, setEnabled] = useState(me.profile.contactWhatsappEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setMessage(null);
    setPending(true);
    try {
      await api("/v1/me", {
        method: "PATCH",
        body: JSON.stringify({
          contactWhatsapp: phone,
          contactWhatsappEnabled: enabled,
        }),
      });
      setMessage("Contacto público actualizado.");
    } catch (err: unknown) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo guardar");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-6 rounded-[16px] border border-border bg-surface p-4 text-sm">
      <h2 className="font-medium text-text">WhatsApp público (opcional)</h2>
      <p className="mt-2 text-text-muted">
        Solo se muestra si lo habilitas. No usamos el teléfono de tus direcciones de envío.
      </p>
      <label className="mt-3 block text-sm">
        Número
        <input
          className={`mt-1 ${controlClassName}`}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+56912345678"
        />
      </label>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        Permitir que me escriban por WhatsApp
      </label>
      {message ? <p className="mt-2 text-sm text-text-muted">{message}</p> : null}
      <button type="button" disabled={pending} className={buttonClassName("secondary", "mt-3")} onClick={() => void save()}>
        {pending ? "Guardando…" : "Guardar contacto"}
      </button>
    </section>
  );
}

export function PublicContactSection() {
  const [me, setMe] = useState<MeView | null>(null);
  useEffect(() => {
    void fetchMe().then(setMe).catch(() => undefined);
  }, []);
  if (!me) return null;
  return <PublicContactForm me={me} />;
}
