import type { CheckoutView, OrderPaymentView, OrderView } from "@tcg/types";
import type { OrderStatus, PaymentStatus, ShippingMethod, CardCondition } from "@tcg/config";
import { toShipmentView, type ShipmentRow } from "../shipping/shipment.mapper";

const partySelect = { id: true, displayName: true, slug: true } as const;

export const orderInclude = {
  buyer: { select: partySelect },
  seller: { select: partySelect },
  items: true,
  payment: true,
  shipment: true,
  rating: { include: { from: { select: partySelect } } },
} as const;

export const checkoutInclude = {
  orders: { orderBy: { createdAt: "asc" as const }, include: orderInclude },
} as const;

type OrderRow = {
  id: string;
  orderNumber: string;
  checkoutId: string;
  status: OrderStatus;
  subtotalClp: number;
  shippingClp: number;
  commissionClp: number;
  marketplaceFeePolicyVersion: string | null;
  sellerPlanCode: string | null;
  marketplacePromotionCode: string | null;
  marketplaceFeeBps: number | null;
  marketplaceFeeCapClp: number | null;
  totalClp: number;
  shippingMethod: ShippingMethod;
  notes: string;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  buyer: { id: string; displayName: string; slug: string };
  seller: { id: string; displayName: string; slug: string };
  items: Array<{
    listingId: string;
    variantId: string;
    titleSnapshot: string;
    condition: CardCondition;
    quantity: number;
    unitPriceClp: number;
  }>;
  payment: {
    id: string;
    status: PaymentStatus;
    amountClp: number;
    heldAt: Date | null;
    releasedAt: Date | null;
  } | null;
  shipment: ShipmentRow | null;
  rating: {
    id: string;
    orderId: string;
    stars: number;
    comment: string;
    isPublic: boolean;
    createdAt: Date;
    from: { id: string; displayName: string; slug: string };
  } | null;
};

export function toOrderView(row: OrderRow): OrderView {
  const shipment = row.shipment ? toShipmentView(row.shipment) : null;
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    checkoutId: row.checkoutId,
    status: row.status,
    subtotalClp: row.subtotalClp,
    shippingClp: row.shippingClp,
    commissionClp: row.commissionClp,
    totalClp: row.totalClp,
    shippingMethod: row.shippingMethod,
    trackingCode: shipment?.trackingCode ?? null,
    meetupAt: shipment?.meetupAt ?? null,
    meetupPlace: shipment?.meetupPlace ?? null,
    notes: row.notes,
    paidAt: row.paidAt?.toISOString() ?? null,
    shippedAt: row.shippedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    buyer: row.buyer,
    seller: row.seller,
    items: row.items.map((item) => ({
      listingId: item.listingId,
      variantId: item.variantId,
      titleSnapshot: item.titleSnapshot,
      condition: item.condition,
      quantity: item.quantity,
      unitPriceClp: item.unitPriceClp,
      lineTotalClp: item.unitPriceClp * item.quantity,
    })),
    payment: toPaymentView(row.payment),
    shipment,
    rating: row.rating
      ? {
          id: row.rating.id,
          orderId: row.rating.orderId,
          stars: row.rating.stars,
          comment: row.rating.comment,
          isPublic: row.rating.isPublic,
          createdAt: row.rating.createdAt.toISOString(),
          from: row.rating.from,
        }
      : null,
    marketplaceFee: row.marketplaceFeePolicyVersion
      ? {
          policyVersion: row.marketplaceFeePolicyVersion,
          planCode: row.sellerPlanCode,
          promotionCode: row.marketplacePromotionCode,
          feeBps: row.marketplaceFeeBps,
          feeCapClp: row.marketplaceFeeCapClp,
        }
      : null,
  };
}

function toPaymentView(
  payment: OrderRow["payment"],
): OrderPaymentView | null {
  if (!payment) return null;
  return {
    id: payment.id,
    status: payment.status,
    amountClp: payment.amountClp,
    heldAt: payment.heldAt?.toISOString() ?? null,
    releasedAt: payment.releasedAt?.toISOString() ?? null,
  };
}

export function toCheckoutView(
  row: {
    id: string;
    status: CheckoutView["status"];
    totalClp: number;
    expiresAt: Date;
    createdAt: Date;
    orders: OrderRow[];
  },
  mp: CheckoutView["mercadopago"],
): CheckoutView {
  return {
    id: row.id,
    status: row.status,
    totalClp: row.totalClp,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    orders: row.orders.map(toOrderView),
    mercadopago: mp,
  };
}
