import { describe, expect, it } from "vitest";
import { checkoutUiStatus, orderTimeline } from "./order-timeline";
import type { OrderView } from "@tcg/types";

function order(partial: Partial<OrderView>): OrderView {
  return {
    id: "o1",
    orderNumber: "TCG-1",
    checkoutId: "c1",
    status: "PAID",
    subtotalClp: 1000,
    shippingClp: 0,
    commissionClp: 0,
    totalClp: 1000,
    shippingMethod: "MEETUP",
    trackingCode: null,
    meetupAt: null,
    meetupPlace: null,
    notes: "",
    paidAt: "2026-01-01T00:00:00.000Z",
    shippedAt: null,
    deliveredAt: null,
    confirmedAt: null,
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    buyer: { id: "b", displayName: "Buyer", slug: "buyer" },
    seller: { id: "s", displayName: "Seller", slug: "seller" },
    items: [],
    payment: null,
    shipment: null,
    rating: null,
    ...partial,
  };
}

describe("orderTimeline", () => {
  it("marks paid current prepare after payment", () => {
    const steps = orderTimeline(order({ status: "PAID" }));
    expect(Array.isArray(steps)).toBe(true);
    if (!Array.isArray(steps)) return;
    expect(steps[1]?.state).toBe("done");
    expect(steps[2]?.state).toBe("current");
  });

  it("closes cancelled orders", () => {
    expect(orderTimeline(order({ status: "CANCELLED" }))).toEqual({ closed: "CANCELLED" });
  });
});

describe("checkoutUiStatus", () => {
  it("never infers approved from a query string", () => {
    expect(
      checkoutUiStatus({ status: "PENDING_PAYMENT", paymentStatuses: ["APPROVED"], timedOut: false }),
    ).toBe("processing");
    expect(checkoutUiStatus({ status: "PAID", paymentStatuses: [], timedOut: false })).toBe("approved");
    expect(checkoutUiStatus({ status: "EXPIRED", paymentStatuses: [], timedOut: false })).toBe("expired");
    expect(
      checkoutUiStatus({ status: "PENDING_PAYMENT", paymentStatuses: ["REJECTED"], timedOut: false }),
    ).toBe("rejected");
    expect(checkoutUiStatus({ status: "PENDING_PAYMENT", paymentStatuses: [], timedOut: true })).toBe("timeout");
  });
});
