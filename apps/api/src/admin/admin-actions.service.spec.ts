import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { adminCancelOrderSchema, adminRetryRefundSchema } from "@tcg/validation";
import type { RequestUser } from "../auth/request-user";
import { AdminActionsService } from "./admin-actions.service";

const admin: RequestUser = {
  id: "admin-1",
  email: "admin@test.local",
  roles: ["ADMIN"],
  sessionId: "s-admin",
  emailVerified: true,
  tokenVersion: 0,
};

describe("admin 10B validation", () => {
  it("requires a cancel reason", () => {
    expect(adminCancelOrderSchema.safeParse({}).success).toBe(false);
    expect(adminCancelOrderSchema.safeParse({ reason: "ab" }).success).toBe(false);
    expect(adminCancelOrderSchema.safeParse({ reason: "soporte_mp" }).success).toBe(true);
  });

  it("rejects amountClp on refund retry body", () => {
    expect(adminRetryRefundSchema.safeParse({}).success).toBe(true);
    expect(adminRetryRefundSchema.safeParse({ amountClp: 1 }).success).toBe(false);
  });
});

describe("AdminActionsService", () => {
  const prisma = {
    order: { findUnique: vi.fn() },
    payment: { findUnique: vi.fn() },
    refund: { findUnique: vi.fn() },
    auditLog: { findFirst: vi.fn(), findMany: vi.fn() },
  };
  const audit = { log: vi.fn() };
  const orders = { cancel: vi.fn() };
  const refunds = { execute: vi.fn() };
  const service = new AdminActionsService(
    prisma as never,
    audit as never,
    orders as never,
    refunds as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not select rawPayload on payment detail", async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.getPayment("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
    const select = prisma.payment.findUnique.mock.calls[0]?.[0]?.select as Record<string, unknown>;
    expect(select.rawPayload).toBeUndefined();
    expect(select.orderId).toBe(true);
  });

  it("does not call the provider when retrying COMPLETED", async () => {
    prisma.refund.findUnique.mockResolvedValue({
      id: "r1",
      status: "COMPLETED",
      paymentId: "p1",
      amountClp: 80000,
      reason: "cancelacion",
      providerRefundId: "mp-rf",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      payment: {
        id: "p1",
        status: "REFUNDED",
        amountClp: 80000,
        providerPaymentId: "mp-1",
        orderId: "o1",
        order: { id: "o1", orderNumber: "TCG-1", status: "REFUNDED" },
      },
    });
    prisma.auditLog.findFirst.mockResolvedValue(null);
    const result = await service.retryRefund(admin, "r1");
    expect(refunds.execute).not.toHaveBeenCalled();
    expect(result.providerCalled).toBe(false);
    expect(result.outcome).toBe("completed");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: admin.id,
        action: "admin.refund.retry",
        metadata: expect.objectContaining({ beforeStatus: "COMPLETED", providerCalled: false }),
      }),
    );
  });

  it("retries FAILED via RefundsService.execute once", async () => {
    prisma.refund.findUnique
      .mockResolvedValueOnce({ id: "r1", status: "FAILED" })
      .mockResolvedValue({
        id: "r1",
        status: "COMPLETED",
        paymentId: "p1",
        amountClp: 80000,
        reason: "cancelacion",
        providerRefundId: "mp-rf",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        payment: {
          id: "p1",
          status: "REFUNDED",
          amountClp: 80000,
          providerPaymentId: "mp-1",
          orderId: "o1",
          order: { id: "o1", orderNumber: "TCG-1", status: "REFUNDED" },
        },
      });
    prisma.auditLog.findFirst.mockResolvedValue({ metadata: { code: "timeout" } });
    refunds.execute.mockResolvedValue("completed");
    const result = await service.retryRefund(admin, "r1");
    expect(refunds.execute).toHaveBeenCalledTimes(1);
    expect(refunds.execute).toHaveBeenCalledWith("r1");
    expect(result.providerCalled).toBe(true);
    expect(result.outcome).toBe("completed");
  });
});
