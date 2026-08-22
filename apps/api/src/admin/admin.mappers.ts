import type {
  AdminListingListItem,
  AdminOrderListItem,
  AdminPartyView,
  AdminPaymentListItem,
  AdminRefundListItem,
  AdminUserListItem,
  ListingStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  Role,
} from "@tcg/types";

export type AdminPartyRow = {
  id: string;
  displayName: string;
  slug: string;
  email: string;
};

export function toAdminParty(row: AdminPartyRow): AdminPartyView {
  return { id: row.id, displayName: row.displayName, slug: row.slug, email: row.email };
}

export function toAdminOrder(row: {
  id: string;
  orderNumber: string;
  checkoutId: string;
  status: OrderStatus;
  subtotalClp: number;
  shippingClp: number;
  commissionClp: number;
  totalClp: number;
  createdAt: Date;
  paidAt: Date | null;
  buyer: AdminPartyRow;
  seller: AdminPartyRow;
  payment: {
    id: string;
    status: PaymentStatus;
    amountClp: number;
    providerPaymentId: string | null;
  } | null;
}): AdminOrderListItem {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    checkoutId: row.checkoutId,
    status: row.status,
    subtotalClp: row.subtotalClp,
    shippingClp: row.shippingClp,
    commissionClp: row.commissionClp,
    totalClp: row.totalClp,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    buyer: toAdminParty(row.buyer),
    seller: toAdminParty(row.seller),
    payment: row.payment
      ? {
          id: row.payment.id,
          status: row.payment.status,
          amountClp: row.payment.amountClp,
          providerPaymentId: row.payment.providerPaymentId,
        }
      : null,
  };
}

export function toAdminPayment(row: {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amountClp: number;
  provider: string;
  providerPaymentId: string | null;
  heldAt: Date | null;
  releasedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  order: { orderNumber: string };
}): AdminPaymentListItem {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    status: row.status,
    amountClp: row.amountClp,
    provider: row.provider,
    providerPaymentId: row.providerPaymentId,
    heldAt: row.heldAt?.toISOString() ?? null,
    releasedAt: row.releasedAt?.toISOString() ?? null,
    refundedAt: row.refundedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAdminRefund(row: {
  id: string;
  paymentId: string;
  amountClp: number;
  reason: string;
  status: RefundStatus;
  providerRefundId: string | null;
  createdAt: Date;
  updatedAt: Date;
  payment: { orderId: string; order: { orderNumber: string } };
}): AdminRefundListItem {
  return {
    id: row.id,
    paymentId: row.paymentId,
    orderId: row.payment.orderId,
    orderNumber: row.payment.order.orderNumber,
    amountClp: row.amountClp,
    reason: row.reason,
    status: row.status,
    providerRefundId: row.providerRefundId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminUser(row: {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  emailVerifiedAt: Date | null;
  isBanned: boolean;
  createdAt: Date;
  roles: Array<{ role: Role }>;
}): AdminUserListItem {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    slug: row.slug,
    roles: row.roles.map((item) => item.role),
    emailVerified: Boolean(row.emailVerifiedAt),
    isBanned: row.isBanned,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAdminListing(row: {
  id: string;
  title: string;
  status: ListingStatus;
  priceClp: number;
  quantity: number;
  quantityReserved: number;
  createdAt: Date;
  seller: AdminPartyRow;
}): AdminListingListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priceClp: row.priceClp,
    quantity: row.quantity,
    quantityReserved: row.quantityReserved,
    createdAt: row.createdAt.toISOString(),
    seller: toAdminParty(row.seller),
  };
}
