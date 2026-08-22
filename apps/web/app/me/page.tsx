"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api, fetchMe, logout, requestAccountDeletion } from "../../lib/api";
import type { MeView } from "@tcg/types";
import { userFacingError, loginHref } from "../../lib/errors";
import { FormError, LoadingBlock, PageMain, SuccessNote, buttonSecondaryClass } from "../../components/ui-feedback";

export default function MePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginHref("/me"));
          return;
        }
        setError(userFacingError(err));
      });
  }, [router]);

  if (error && !me) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!me) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">{me.displayName}</h1>
      <p className="mt-2 text-neutral-600">{me.email}</p>
      <p className="mt-1 text-sm text-neutral-600">
        {me.emailVerified ? "Email verificado" : "Email pendiente de verificación"} · roles: {me.roles.join(", ")}
      </p>
      {!me.emailVerified ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>Verifica tu email para comprar y vender.</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link href="/verificar-email" className="underline">
              Tengo un token
            </Link>
            <button
              type="button"
              className="underline"
              onClick={() => {
                void api("/v1/auth/resend-verification", { method: "POST" })
                  .then(() => setNotice("Si el envío está activo, te llega un correo con el token."))
                  .catch((err: unknown) => setError(userFacingError(err)));
              }}
            >
              Reenviar verificación
            </button>
          </div>
        </div>
      ) : null}
      {me.legal.stale ? (
        <p className="mt-4 rounded border border-neutral-200 p-3 text-sm text-neutral-700">
          Hay una versión más nueva de términos o privacidad. No te pedimos reaceptar ahora.{" "}
          <Link href="/terminos" className="underline">
            Ver términos
          </Link>
        </p>
      ) : null}
      <FormError message={error} />
      <SuccessNote message={notice} />
      <section className="mt-6 rounded border border-neutral-200 p-4 text-sm text-neutral-700">
        <h2 className="font-semibold text-neutral-900">Datos de la cuenta</h2>
        <p className="mt-2">Nombre público: {me.displayName}</p>
        <p>Comuna: {me.profile.comuna ?? "—"}</p>
        <p>Región: {me.profile.region ?? "—"}</p>
        <p className="mt-2">
          Términos aceptados: {me.legal.termsVersion ?? "versión anterior no registrada"} · Privacidad:{" "}
          {me.legal.privacyVersion ?? "versión anterior no registrada"}
        </p>
        <p className="mt-2">Novedades opcionales: {me.legal.marketingOptIn ? "sí" : "no"}</p>
      </section>
      <nav className="mt-6 grid gap-2 text-sm">
        <Link href="/me/coleccion" className="underline">Mi colección</Link>
        <Link href="/me/wishlist" className="underline">Wishlist</Link>
        <Link href="/me/favoritos" className="underline">Favoritos</Link>
        <Link href="/me/notificaciones" className="underline">Notificaciones</Link>
        <Link href="/me/compras" className="underline">Mis compras</Link>
        <Link href="/me/disputas" className="underline">Mis reclamos</Link>
        <Link href="/me/ventas" className="underline">Mis ventas</Link>
        <Link href="/me/balance" className="underline">Saldo vendedor</Link>
        <Link href="/vender" className="underline">Vender</Link>
        <Link href="/me/publicaciones" className="underline">Mis publicaciones</Link>
        <Link href="/me/vendedor" className="underline">Onboarding vendedor</Link>
        <Link href="/me/direcciones" className="underline">Direcciones</Link>
        <Link href="/me/seguridad" className="underline">Seguridad y sesiones</Link>
        <Link href={`/vendedores/${me.slug}`} className="underline">Perfil público</Link>
        <Link href="/ayuda" className="underline">Ayuda y feedback</Link>
      </nav>
      <button
        type="button"
        className={`${buttonSecondaryClass} mt-8`}
        onClick={() => {
          void logout().then(() => router.push("/"));
        }}
      >
        Cerrar sesión
      </button>
      <p className="mt-8 text-sm text-neutral-600">
        Si pides desactivar la cuenta, no borramos órdenes, pagos, reembolsos, ledger ni auditoría.
      </p>
      <button
        type="button"
        disabled={pendingDelete}
        className="mt-2 rounded border border-red-300 px-4 py-2 text-sm text-red-800 disabled:opacity-50"
        onClick={() => {
          if (!window.confirm("¿Desactivar tu cuenta? Los registros financieros se conservan.")) return;
          setPendingDelete(true);
          void requestAccountDeletion()
            .then(async () => {
              await logout();
              router.push("/");
            })
            .catch((err: unknown) => {
              setError(userFacingError(err));
              setPendingDelete(false);
            });
        }}
      >
        {pendingDelete ? "Solicitando…" : "Solicitar desactivación de cuenta"}
      </button>
    </PageMain>
  );
}
