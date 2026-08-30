"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatClp, SELLER_PLANS, sellerPlanLabel } from "@tcg/config";
import type { AdminSellerPlanView } from "@tcg/types";
import { ConfirmAction, Meta } from "@/components/confirm-action";
import { api } from "@/lib/api";

export default function AdminSellerPlanPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AdminSellerPlanView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api<AdminSellerPlanView>(`/v1/admin/sellers/${id}/plan`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError("No se pudo cargar el plan"));
  }, [load]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/users" className="text-sm text-neutral-400 underline">
          Usuarios
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Plan del vendedor</h1>
        <p className="font-mono text-xs text-neutral-500">{data.sellerId}</p>
      </div>
      <p className="rounded border border-amber-900 bg-amber-950/40 p-3 text-sm text-amber-100">
        Plan asignado manualmente. No existe cobro recurrente automático.
      </p>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Plan actual">{sellerPlanLabel(data.plan)}</Meta>
        <Meta label="Inicio">{data.startsAt ?? "—"}</Meta>
        <Meta label="Fin">{data.endsAt ?? "—"}</Meta>
        <Meta label="Origen">{data.source ?? "FREE por defecto"}</Meta>
        <Meta label="Comisión">{data.normalFeeBps} bps</Meta>
        <Meta label="Tope">{formatClp(data.normalFeeCapClp)}</Meta>
        <Meta label="Mensualidad">{formatClp(data.monthlyPriceClp)}</Meta>
      </section>
      <div className="flex flex-wrap gap-2">
        {SELLER_PLANS.map((plan) => (
          <ConfirmAction
            key={plan}
            title={`Asignar ${sellerPlanLabel(plan)}`}
            confirmLabel={`¿Asignar ${sellerPlanLabel(plan)} sin cobro automático?`}
            requireReason
            onConfirm={async (reason) => {
              if (!id) return;
              setError(null);
              await api(`/v1/admin/sellers/${id}/plan`, {
                method: "POST",
                body: JSON.stringify({ plan, reason }),
              });
              await load();
            }}
          />
        ))}
      </div>
    </div>
  );
}
