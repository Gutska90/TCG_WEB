"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, api } from "../../../lib/api";
import { ChilePlaceFields } from "../../../components/chile-place-fields";

export default function SellerOnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(form: FormData) {
    setError(null);
    try {
      await api("/v1/me/seller-onboarding", {
        method: "POST",
        body: JSON.stringify({
          recipientName: String(form.get("recipientName") ?? ""),
          phone: String(form.get("phone") ?? ""),
          line1: String(form.get("line1") ?? ""),
          line2: String(form.get("line2") ?? "") || undefined,
          comuna: String(form.get("comuna") ?? ""),
          region: String(form.get("region") ?? ""),
          postalCode: String(form.get("postalCode") ?? "") || undefined,
          acceptTerms: form.get("acceptTerms") === "on",
        }),
      });
      router.push("/vender");
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/ingresar");
        return;
      }
      setError(err instanceof ApiError ? err.message : "No se pudo completar el onboarding");
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Onboarding vendedor</h1>
      <p className="mt-2 text-sm text-text-muted">Dirección de despacho y términos para publicar.</p>
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <form action={onSubmit} className="mt-6 grid gap-3">
        <label className="text-sm">
          Nombre destinatario
          <input name="recipientName" required className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <label className="text-sm">
          Teléfono
          <input name="phone" required className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <label className="text-sm">
          Dirección
          <input name="line1" required className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <label className="text-sm">
          Depto / extra
          <input name="line2" className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <ChilePlaceFields />
        <label className="text-sm">
          Código postal
          <input name="postalCode" className="mt-1 w-full rounded-[12px] border border-border bg-surface px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input name="acceptTerms" type="checkbox" required />
          Acepto los términos de vendedor
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center rounded-[12px] border border-border bg-surface px-4 py-2 text-sm">
          Activar cuenta vendedor
        </button>
      </form>
    </main>
  );
}
