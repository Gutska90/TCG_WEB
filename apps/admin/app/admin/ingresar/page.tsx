"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { MeView } from "@tcg/types";
import { canAccessAdminApp } from "@/lib/access";
import { ApiError, api, login, logout } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("email")), String(form.get("password")));
      const me = await api<MeView>("/v1/me");
      if (!canAccessAdminApp(me.roles)) {
        await logout();
        setError("Sin permiso de administración");
        return;
      }
      router.push(me.roles.includes("MODERATOR") && !me.roles.includes("ADMIN") && !me.roles.includes("SUPER_ADMIN")
        ? "/admin/disputes"
        : "/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo ingresar");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Ingresar al admin</h1>
      <p className="mt-2 text-sm text-neutral-400">Solo cuentas de staff (ADMIN, SUPER_ADMIN o MODERATOR).</p>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-white px-4 py-2 text-neutral-950 disabled:opacity-50"
        >
          {pending ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
