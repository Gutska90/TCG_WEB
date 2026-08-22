"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { SellerBalanceView } from "@tcg/types";
import { Meta } from "@/components/confirm-action";
import { api } from "@/lib/api";

export default function AdminSellerBalancePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<SellerBalanceView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api<SellerBalanceView>(`/v1/admin/sellers/${id}/balance`)
      .then(setData)
      .catch(() => setError("No se pudo cargar el saldo"));
  }, [id]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/ledger" className="text-sm text-neutral-400 underline">
          Ledger
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Saldo seller</h1>
        <p className="font-mono text-xs text-neutral-500">{data.sellerId}</p>
      </div>
      {data.availableClp < 0 ? (
        <p className="rounded border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">
          Saldo negativo (deuda). Bloquea payouts nuevos hasta recuperar.
        </p>
      ) : null}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Meta label="Pendiente">{formatClp(data.pendingClp)}</Meta>
        <Meta label="Disponible">{formatClp(data.availableClp)}</Meta>
        <Meta label="En disputa">{formatClp(data.disputedClp)}</Meta>
        <Meta label="Reservado">{formatClp(data.reservedClp)}</Meta>
        <Meta label="Pagado">{formatClp(data.paidClp)}</Meta>
        <Meta label="Neto (aún adeudado)">{formatClp(data.netClp)}</Meta>
      </section>
      <p className="text-sm text-neutral-400">
        Fuente de verdad: ledger. No hay campo balance mutable.
      </p>
    </div>
  );
}
