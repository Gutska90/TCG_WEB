"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, fetchMe, logout } from "../../lib/api";
import type { MeView } from "@tcg/types";

export default function MePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/ingresar");
          return;
        }
        setError(err instanceof ApiError ? err.message : "No se pudo cargar el perfil");
      });
  }, [router]);

  if (error) {
    return <main className="mx-auto max-w-md px-6 py-16 text-red-700">{error}</main>;
  }
  if (!me) {
    return <main className="mx-auto max-w-md px-6 py-16 text-neutral-500">Cargando…</main>;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">{me.displayName}</h1>
      <p className="mt-2 text-neutral-600">{me.email}</p>
      <p className="mt-1 text-sm text-neutral-500">
        {me.emailVerified ? "Email verificado" : "Email pendiente de verificación"} · roles:{" "}
        {me.roles.join(", ")}
      </p>
      <nav className="mt-6 grid gap-2 text-sm">
        <Link href="/carrito" className="underline">
          Carrito
        </Link>
        <Link href="/me/compras" className="underline">
          Mis compras
        </Link>
        <Link href="/me/ventas" className="underline">
          Mis ventas
        </Link>
        <Link href="/vender" className="underline">
          Vender
        </Link>
        <Link href="/me/publicaciones" className="underline">
          Mis publicaciones
        </Link>
        <Link href="/me/vendedor" className="underline">
          Onboarding vendedor
        </Link>
        <Link href="/me/direcciones" className="underline">
          Direcciones
        </Link>
        <Link href={`/vendedores/${me.slug}`} className="underline">
          Perfil público
        </Link>
      </nav>
      <button
        type="button"
        className="mt-8 rounded border border-neutral-300 px-4 py-2 text-sm"
        onClick={() => {
          void logout().then(() => router.push("/"));
        }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
