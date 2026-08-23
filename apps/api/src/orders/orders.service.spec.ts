import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, commissionClp, quoteShippingClp } from "@tcg/config";
import { OrdersService } from "./orders.service";
import type { RequestUser } from "../auth/request-user";
import { flagsForTest } from "../flags/feature-flags.service";
import { MetricsService } from "../observability/metrics.service";

const buyer: RequestUser = {
  id: "buyer-1",
  email: "b@b.cl",
  roles: ["USER"],
  sessionId: "s1",
  emailVerified: true,
  tokenVersion: 0,
};

const seller: RequestUser = {
  id: "seller-1",
  email: "s@b.cl",
  roles: ["USER", "SELLER"],
  sessionId: "s2",
  emailVerified: true,
  tokenVersion: 0,
};

describe("money snapshots", () => {
  it("takes 6% FREE commission from product subtotal only (no promo)", () => {
    expect(commissionClp(10_000)).toBe(600);
    expect(commissionClp(1)).toBe(0);
  });

  it("charges regional shipping except meetup", () => {
    expect(quoteShippingClp("MEETUP", "RM", "RM")).toBe(0);
    expect(quoteShippingClp("CHILEXPRESS", "RM", "RM")).toBe(3990);
    expect(quoteShippingClp("CHILEXPRESS", "RM", "REGIONS")).toBe(5990);
  });
});

describe("OrdersService", () => {
  const prisma = {
    checkout: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    cart: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), create: vi.fn() },
    payment: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    refund: { create: vi.fn() },
    address: { findFirst: vi.fn() },
    cartItem: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  };
  const audit = { log: vi.fn() };
  const shipping = {
    quoteFromPlaces: vi.fn().mockResolvedValue({ priceClp: 0 }),
  };
  const refunds = { execute: vi.fn(), executeOpenForCheckout: vi.fn(), hasBlockingRefund: vi.fn().mockResolvedValue(false) };
  const ledger = { recordCapture: vi.fn(), recordRelease: vi.fn() };
  const service = new OrdersService(
    prisma as never,
    audit as never,
    shipping as never,
    refunds as never,
    ledger as never,
    flagsForTest() as never,
    new MetricsService(),
    { applySaleDeduction: vi.fn() } as never,
    { safeEmit: vi.fn() } as never,
    { lockSellers: vi.fn() } as never,
    { calculate: vi.fn(), recordOrderQuote: vi.fn() } as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects checkout without verified email", async () => {
    await expect(
      service.createCheckout(
        { ...buyer, emailVerified: false },
        { shippingSelections: [{ sellerId: "seller-1", method: "MEETUP" }] },
        undefined,
        { initPoint: null, sandboxInitPoint: null, mock: true },
      ),
    ).rejects.toMatchObject({
      code: ERROR_CODES.EMAIL_NOT_VERIFIED,
      status: HttpStatus.FORBIDDEN,
    });
  });

  it("rejects empty cart", async () => {
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    prisma.cart.findUnique.mockResolvedValue({ id: "c1", items: [] });
    await expect(
      service.createCheckout(
        buyer,
        { shippingSelections: [{ sellerId: "seller-1", method: "MEETUP" }] },
        undefined,
        { initPoint: null, sandboxInitPoint: null, mock: true },
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.CART_EMPTY, status: HttpStatus.BAD_REQUEST });
  });

  it("404s another user's order (no IDOR leak)", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "o1",
      buyerId: "other",
      sellerId: "seller-9",
      checkoutId: "ch1",
      status: "PAID",
      items: [],
    });
    await expect(service.get(buyer, "o1")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });

  it("blocks illegal prepare before PAID", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "o1",
      buyerId: buyer.id,
      sellerId: seller.id,
      checkoutId: "ch1",
      status: "PENDING_PAYMENT",
      items: [],
    });
    await expect(service.prepare(seller, "o1")).rejects.toMatchObject({
      code: ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
      status: HttpStatus.CONFLICT,
    });
  });

  it("does not confirm unless payment is HELD", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "o1",
      buyerId: buyer.id,
      sellerId: seller.id,
      checkoutId: "ch1",
      status: "DELIVERED",
      items: [],
    });
    prisma.payment.findUnique.mockResolvedValue({ id: "p1", status: "PENDING" });
    await expect(service.confirm(buyer, "o1")).rejects.toMatchObject({
      code: ERROR_CODES.PAYMENT_NOT_HELD,
      status: HttpStatus.CONFLICT,
    });
  });
});
