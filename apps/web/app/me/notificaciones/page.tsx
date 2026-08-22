"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NOTIFICATION_TYPE_LABELS } from "@tcg/config";
import type { NotificationListView, NotificationPreferenceView } from "@tcg/types";
import { ApiError, api } from "../../../lib/api";
import { loginHref, userFacingError } from "../../../lib/errors";
import { FormError, LoadingBlock, PageMain } from "../../../components/ui-feedback";

export default function NotificationsPage() {
  const router = useRouter();
  const [data, setData] = useState<NotificationListView | null>(null);
  const [prefs, setPrefs] = useState<NotificationPreferenceView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<NotificationListView>("/v1/me/notifications?pageSize=50"),
      api<NotificationPreferenceView[]>("/v1/me/notification-preferences"),
    ])
      .then(([list, nextPrefs]) => {
        setData(list);
        setPrefs(nextPrefs);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(loginHref("/me/notificaciones"));
          return;
        }
        setError(userFacingError(err));
      });
  }, [router]);

  async function markAll() {
    setError(null);
    try {
      await api("/v1/me/notifications/read-all", { method: "POST" });
      const next = await api<NotificationListView>("/v1/me/notifications?pageSize=50");
      setData(next);
    } catch (err: unknown) {
      setError(userFacingError(err));
    }
  }

  async function patchPref(type: NotificationPreferenceView["type"], field: "inApp" | "email", value: boolean) {
    setPending(`${type}:${field}`);
    setError(null);
    try {
      const next = await api<NotificationPreferenceView>("/v1/me/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify({ type, [field]: value }),
      });
      setPrefs((current) => (current ?? []).map((row) => (row.type === next.type ? next : row)));
    } catch (err: unknown) {
      setError(userFacingError(err));
    } finally {
      setPending(null);
    }
  }

  if (error && !data) {
    return (
      <PageMain>
        <FormError message={error} />
      </PageMain>
    );
  }
  if (!data || !prefs) {
    return (
      <PageMain>
        <LoadingBlock />
      </PageMain>
    );
  }

  const priceDrop = prefs.find((row) => row.type === "PRICE_DROP");
  const wishlistHit = prefs.find((row) => row.type === "WISHLIST_HIT");

  return (
    <PageMain>
      <h1 className="text-2xl font-semibold">Notificaciones</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {data.unreadCount} sin leer. El push aún no está activo en esta beta; el correo sigue tus preferencias.
      </p>
      <FormError message={error} />
      <section className="mt-6 rounded border p-4 text-sm">
        <h2 className="font-medium">Alertas</h2>
        <p className="mt-1 text-neutral-600">
          El aviso de wishlist siempre aparece aquí. La bajada de precio es opt-in y no cubre push todavía.
        </p>
        <label className="mt-4 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={priceDrop?.inApp ?? false}
            disabled={pending === "PRICE_DROP:inApp"}
            onChange={(event) => void patchPref("PRICE_DROP", "inApp", event.target.checked)}
          />
          <span>Avisarme en la app si baja el precio 10% o más ({NOTIFICATION_TYPE_LABELS.PRICE_DROP})</span>
        </label>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={wishlistHit?.email ?? false}
            disabled={pending === "WISHLIST_HIT:email"}
            onChange={(event) => void patchPref("WISHLIST_HIT", "email", event.target.checked)}
          />
          <span>Correo cuando aparece una carta de mi wishlist</span>
        </label>
        <label className="mt-3 flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1"
            checked={priceDrop?.email ?? false}
            disabled={pending === "PRICE_DROP:email"}
            onChange={(event) => void patchPref("PRICE_DROP", "email", event.target.checked)}
          />
          <span>Correo cuando baja el precio</span>
        </label>
      </section>
      {data.unreadCount > 0 ? (
        <button type="button" className="mt-4 rounded border px-3 py-2 text-sm" onClick={() => void markAll()}>
          Marcar todas como leídas
        </button>
      ) : null}
      {data.items.length === 0 ? (
        <p className="mt-8 text-neutral-600">No hay notificaciones todavía.</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {data.items.map((row) => (
            <li key={row.id} className={`rounded border p-4 text-sm ${row.readAt ? "text-neutral-600" : "bg-neutral-50"}`}>
              <p className="font-medium">{row.title}</p>
              <p className="mt-1">{row.body}</p>
              <p className="mt-2 text-xs text-neutral-500">{new Date(row.createdAt).toLocaleString("es-CL")}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-8 text-sm">
        <Link href="/me" className="underline">
          Volver al perfil
        </Link>
      </p>
    </PageMain>
  );
}
