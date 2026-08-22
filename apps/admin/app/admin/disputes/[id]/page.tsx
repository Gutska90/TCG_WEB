"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DISPUTE_REASON_LABELS, formatClp } from "@tcg/config";
import type { AdminDisputeDetailView } from "@tcg/types";
import { ConfirmAction, Meta } from "@/components/confirm-action";
import { DisputeBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function AdminDisputeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<AdminDisputeDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api<AdminDisputeDetailView>(`/v1/admin/disputes/${id}`));
  }, [id]);

  useEffect(() => {
    void load().catch(() => setError("No se pudo cargar la disputa"));
  }, [load]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-400">Cargando disputa…</p>;

  const closed = data.status === "RESOLVED_BUYER" || data.status === "RESOLVED_SELLER" || data.status === "CANCELLED";

  async function act(path: string, body?: Record<string, string>) {
    await api(`/v1/admin/disputes/${id}/${path}`, {
      method: "POST",
      body: body ? JSON.stringify(body) : "{}",
    });
    await load();
  }

  return (
    <div className="grid gap-6">
      <p className="text-sm">
        <Link href="/admin/disputes" className="underline">
          Disputas
        </Link>
      </p>
      <div>
        <h1 className="text-2xl font-semibold">{data.orderNumber}</h1>
        <p className="mt-1 text-sm text-neutral-400">{DISPUTE_REASON_LABELS[data.reason]}</p>
        <div className="mt-2">
          <DisputeBadge status={data.status} />
        </div>
      </div>
      <p className="rounded border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
        Esto no corrige dinero. Si corresponde un reembolso, usa Órdenes / Refunds.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Meta label="Comprador">
          {data.buyer.displayName} · {data.buyerEmail}
        </Meta>
        <Meta label="Vendedor">
          {data.seller.displayName} · {data.sellerEmail}
        </Meta>
        <Meta label="Pago">
          {data.payment
            ? `${data.payment.status} · ${formatClp(data.payment.amountClp)}`
            : "sin pago"}
        </Meta>
        <Meta label="Envío">{data.shipment?.status ?? "sin envío"}</Meta>
        <Meta label="Orden">
          <Link href={`/admin/orders/${data.orderId}`} className="underline">
            {data.orderNumber}
          </Link>
        </Meta>
        <Meta label="Asignado">{data.assignedAdminId ?? "nadie"}</Meta>
      </div>
      {data.refunds.length > 0 ? (
        <section>
          <h2 className="mb-2 font-medium">Refunds</h2>
          <ul className="text-sm text-neutral-300">
            {data.refunds.map((row) => (
              <li key={row.id}>
                {row.status} · {formatClp(row.amountClp)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="mb-2 font-medium">Mensajes</h2>
        <ul className="grid gap-2 text-sm">
          {data.messages.map((row) => (
            <li key={row.id} className="rounded border border-neutral-800 p-3">
              <p className="text-xs text-neutral-500">
                {row.author.displayName}
                {row.isInternalAdminNote ? " · nota interna" : ""} · {row.createdAt.slice(0, 16)}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{row.body}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Evidencia</h2>
        <ul className="text-sm">
          {data.evidence.map((row) => (
            <li key={row.id}>
              {row.evidenceType} · {row.mime} · {row.size} bytes
              {row.description ? ` · ${row.description}` : ""}
            </li>
          ))}
          {data.evidence.length === 0 ? <li className="text-neutral-500">Sin archivos</li> : null}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Revisiones de listing</h2>
        <ul className="text-sm text-neutral-300">
          {data.listingRevisions.map((row) => (
            <li key={row.id}>
              {row.source} · {row.reason || "sin motivo"} · {row.createdAt.slice(0, 16)}
            </li>
          ))}
          {data.listingRevisions.length === 0 ? <li className="text-neutral-500">Sin revisiones</li> : null}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Auditoría</h2>
        <ul className="text-sm text-neutral-400">
          {data.timeline.map((row) => (
            <li key={row.id}>
              {row.createdAt.slice(0, 16)} · {row.action} · {row.entityType}
            </li>
          ))}
        </ul>
      </section>
      {closed ? null : (
        <div className="flex flex-wrap gap-3">
          <ConfirmAction
            title="Asignarme"
            confirmLabel="Quedarás como staff asignado."
            onConfirm={() => act("assign")}
          />
          <ConfirmAction
            title="En revisión"
            confirmLabel="Pasar a UNDER_REVIEW."
            onConfirm={() => act("status", { status: "UNDER_REVIEW" })}
          />
          <ConfirmAction
            title="Resolver a favor del comprador"
            confirmLabel="No ejecuta refund. Debes reembolsar aparte si corresponde."
            requireReason
            onConfirm={(note) => act("resolve", { outcome: "BUYER", note })}
          />
          <ConfirmAction
            title="Resolver a favor del vendedor"
            confirmLabel="No libera payout. El dinero sigue el flujo 10C."
            requireReason
            onConfirm={(note) => act("resolve", { outcome: "SELLER", note })}
          />
          <ConfirmAction
            title="Cancelar disputa"
            confirmLabel="Cierra sin favorecer a ninguna parte."
            requireReason
            onConfirm={(note) => act("resolve", { outcome: "CANCELLED", note })}
          />
        </div>
      )}
      {data.resolution ? <p className="text-sm text-neutral-400">Resolución: {data.resolution}</p> : null}
    </div>
  );
}
