"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClp } from "@tcg/config";
import type { AdminDashboardView } from "@tcg/types";
import { KpiCard } from "@/components/kpi-card";
import { api } from "@/lib/api";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<AdminDashboardView>("/v1/admin/dashboard")
      .then(setData)
      .catch(() => setError("No se pudo cargar el dashboard"));
  }, []);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-neutral-400">Cargando métricas…</p>;
  }

  const { operation: op, money: m } = data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Operación</h1>
        <p className="text-sm text-neutral-400">
          Zona {data.timezone}. Códigos internos HELD/RELEASED no son escrow de Mercado Pago.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">
          Operación
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Usuarios" value={String(op.usersTotal)} />
          <KpiCard label="Vendedores" value={String(op.sellersTotal)} />
          <KpiCard label="Listings activos" value={String(op.listingsActive)} />
          <KpiCard label="Órdenes hoy" value={String(op.ordersCreatedToday)} />
          <KpiCard label="Pendientes de envío" value={String(op.ordersPendingShipment)} />
          <KpiCard label="Disputadas" value={String(op.ordersDisputed)} />
          <KpiCard label="Refunds pendientes" value={String(op.refundsPending)} />
          <KpiCard label="Refunds fallidos" value={String(op.refundsFailed)} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">Dinero</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="GMV hoy" value={formatClp(m.gmvTodayClp)} />
          <KpiCard label="GMV 30 días" value={formatClp(m.gmvLast30dClp)} />
          <KpiCard label="Pagos recibidos (no liquidables)" value={`${m.paymentsHeld} · ${formatClp(m.amountHeldClp)}`} />
          <KpiCard
            label="Pagos elegibles para liquidación"
            value={`${m.paymentsReleased} · ${formatClp(m.amountReleasedClp)}`}
          />
          <KpiCard label="Cobrado en cuenta plataforma" value={formatClp(m.collectedMpClp)} />
          <KpiCard
            label="Pendiente sellers (aún no liquidable)"
            value={formatClp(m.pendingSellerHeldClp)}
            hint="total − comisión (aprox. 10A; saldo exacto en /admin/sellers/:id/balance)"
          />
          <KpiCard label="Comisión abierta" value={formatClp(m.platformCommissionOpenClp)} />
          <KpiCard
            label="Refunds abiertos"
            value={`${m.refundsPending} · ${formatClp(m.refundsPendingClp)}`}
          />
          <KpiCard
            label="Payouts pendientes"
            value={`${m.payoutsPending} · ${formatClp(m.payoutsPendingClp)}`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-400 uppercase">Alertas</h2>
        {data.alerts.length === 0 ? (
          <p className="text-sm text-neutral-500">Sin alertas locales.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.alerts.map((alert) => (
              <li key={alert.code}>
                <Link
                  href={alert.href}
                  className="flex items-center justify-between rounded border border-red-900 bg-red-950/40 px-4 py-3 text-sm"
                >
                  <span>{alert.label}</span>
                  <span className="tabular-nums">{alert.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
