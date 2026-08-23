import type { OrderView } from "@tcg/types";

type Step = {
  label: string;
  at: string | null;
  state: "done" | "current" | "pending";
};

const LATER_THAN_PAID = new Set([
  "PAID",
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "DISPUTED",
]);

const LATER_THAN_PREP = new Set([
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "DISPUTED",
]);

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
}

export function OrderTimeline({ order }: { order: OrderView }) {
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return (
      <p className="mt-4 text-sm text-text-muted">
        Esta orden está {order.status === "CANCELLED" ? "cancelada" : "reembolsada"}. No hay más pasos de entrega.
      </p>
    );
  }

  const paidDone = Boolean(order.paidAt) || LATER_THAN_PAID.has(order.status);
  const prepDone = LATER_THAN_PREP.has(order.status);
  const shippedDone = Boolean(order.shippedAt);
  const deliveredDone = Boolean(order.deliveredAt);
  const confirmedDone = Boolean(order.confirmedAt ?? order.completedAt);

  const steps: Step[] = [
    { label: "Pedido creado", at: order.createdAt, state: "done" },
    {
      label: "Pago recibido",
      at: order.paidAt,
      state: paidDone ? "done" : order.status === "PENDING_PAYMENT" ? "current" : "pending",
    },
    {
      label: "Preparando",
      at: null,
      state: prepDone ? "done" : paidDone && order.status === "PAID" ? "current" : "pending",
    },
    {
      label: order.shippingMethod === "MEETUP" ? "Listo para encuentro / despachado" : "Despachado",
      at: order.shippedAt,
      state: shippedDone ? "done" : order.status === "PREPARING" ? "current" : "pending",
    },
    {
      label: "Entregado",
      at: order.deliveredAt,
      state: deliveredDone ? "done" : order.status === "SHIPPED" || order.status === "READY_FOR_MEETUP" ? "current" : "pending",
    },
    {
      label: "Confirmado",
      at: order.confirmedAt ?? order.completedAt,
      state: confirmedDone ? "done" : order.status === "DELIVERED" ? "current" : "pending",
    },
  ];

  return (
    <section className="mt-6" aria-label="Estado de la orden">
      <h2 className="text-sm font-semibold">Línea de tiempo</h2>
      <ol className="mt-3 grid gap-2">
        {steps.map((step) => (
          <li key={step.label} className="flex gap-3 text-sm">
            <span
              className={
                step.state === "done"
                  ? "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                  : step.state === "current"
                    ? "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-primary"
                    : "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border border-border"
              }
              aria-hidden
            />
            <span className={step.state === "pending" ? "text-text-muted" : "text-text"}>
              {step.label}
              {step.at ? <span className="text-text-muted"> · {formatWhen(step.at)}</span> : null}
              {step.state === "current" ? <span className="text-text-muted"> · ahora</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
