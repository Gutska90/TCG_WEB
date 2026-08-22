import type { OrderView } from "@tcg/types";

export type TimelineStep = {
  label: string;
  at: string | null;
  state: "done" | "current" | "pending";
};

const AFTER_PAID = new Set([
  "PAID",
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "DISPUTED",
]);

const AFTER_PREP = new Set([
  "PREPARING",
  "SHIPPED",
  "READY_FOR_MEETUP",
  "DELIVERED",
  "CONFIRMED",
  "COMPLETED",
  "DISPUTED",
]);

export function orderTimeline(order: OrderView): TimelineStep[] | { closed: "CANCELLED" | "REFUNDED" } {
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { closed: order.status };
  }
  const paidDone = Boolean(order.paidAt) || AFTER_PAID.has(order.status);
  const prepDone = AFTER_PREP.has(order.status);
  const shippedDone = Boolean(order.shippedAt);
  const deliveredDone = Boolean(order.deliveredAt);
  const confirmedDone = Boolean(order.confirmedAt ?? order.completedAt);
  return [
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
}

export type CheckoutUiStatus = "processing" | "approved" | "rejected" | "expired" | "timeout" | "cancelled";

export function checkoutUiStatus(input: {
  status: "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED";
  paymentStatuses: Array<string | undefined>;
  timedOut: boolean;
}): CheckoutUiStatus {
  if (input.status === "PAID") return "approved";
  if (input.status === "EXPIRED") return "expired";
  if (input.status === "CANCELLED") return "cancelled";
  if (input.paymentStatuses.some((status) => status === "REJECTED")) return "rejected";
  if (input.timedOut) return "timeout";
  return "processing";
}
