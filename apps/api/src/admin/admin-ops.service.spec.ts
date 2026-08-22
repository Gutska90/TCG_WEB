import { HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_OPS_ROLES, ERROR_CODES } from "@tcg/config";
import { RolesGuard } from "../common/guards/roles.guard";
import type { RequestUser } from "../auth/request-user";
import { AdminOpsService } from "./admin-ops.service";
import { flagsForTest } from "../flags/feature-flags.service";
import type { ExecutionContext } from "@nestjs/common";

function actor(roles: RequestUser["roles"]): RequestUser {
  return {
    id: "u1",
    email: "ops@test.local",
    roles,
    sessionId: "s1",
    emailVerified: true,
    tokenVersion: 0,
  };
}

function contextWith(user: RequestUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext; // test double: RolesGuard only uses these
}

function opsGuard(): RolesGuard {
  const reflector = {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === "isPublic") return false;
      if (key === "roles") return [...ADMIN_OPS_ROLES];
      return undefined;
    }),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe("Admin 10A RBAC", () => {
  it.each([["USER" as const], ["SELLER" as const], ["MODERATOR" as const]])(
    "denies %s",
    (role) => {
      const guard = opsGuard();
      expect(() => guard.canActivate(contextWith(actor([role])))).toThrow();
      try {
        guard.canActivate(contextWith(actor([role])));
      } catch (error) {
        expect(error).toMatchObject({ code: ERROR_CODES.FORBIDDEN, status: HttpStatus.FORBIDDEN });
      }
    },
  );

  it.each([["ADMIN" as const], ["SUPER_ADMIN" as const]])("allows %s", (role) => {
    expect(opsGuard().canActivate(contextWith(actor([role])))).toBe(true);
  });
});

describe("AdminOpsService lists", () => {
  const prisma = {
    order: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    payment: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
    refund: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
    listing: { findMany: vi.fn(), count: vi.fn() },
    userRole: { count: vi.fn() },
    payout: { aggregate: vi.fn(), count: vi.fn() },
    checkout: { count: vi.fn() },
    webhookEvent: { count: vi.fn() },
    reconciliationIssue: { count: vi.fn() },
    jobRun: { count: vi.fn() },
    dispute: { count: vi.fn() },
    auditLog: { count: vi.fn() },
    $queryRaw: vi.fn(),
  };
  const service = new AdminOpsService(prisma as never, flagsForTest());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not select passwordHash, tokens, or payment rawPayload", async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: "u1",
        email: "a@b.cl",
        displayName: "Ana",
        slug: "ana",
        emailVerifiedAt: new Date("2026-01-01"),
        isBanned: false,
        createdAt: new Date("2026-01-01"),
        roles: [{ role: "USER" }],
      },
    ]);
    prisma.user.count.mockResolvedValue(1);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payment.count.mockResolvedValue(0);

    const users = await service.listUsers({ page: 1, pageSize: 20 });
    expect(users.items[0]).toEqual({
      id: "u1",
      email: "a@b.cl",
      displayName: "Ana",
      slug: "ana",
      roles: ["USER"],
      emailVerified: true,
      isBanned: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(JSON.stringify(users)).not.toMatch(/passwordHash|refreshToken|rawPayload|accessToken/);
    const userSelect = prisma.user.findMany.mock.calls[0]?.[0]?.select as Record<string, unknown>;
    expect(userSelect.passwordHash).toBeUndefined();
    expect(userSelect.identities).toBeUndefined();
    expect(userSelect.sessions).toBeUndefined();

    await service.listPayments({ page: 1, pageSize: 20 });
    const paymentSelect = prisma.payment.findMany.mock.calls[0]?.[0]?.select as Record<string, unknown>;
    expect(paymentSelect.rawPayload).toBeUndefined();
  });

  it("computes HELD totals from groupBy without loading payment rows", async () => {
    prisma.user.count.mockResolvedValue(4);
    prisma.userRole.count.mockResolvedValue(2);
    prisma.listing.count.mockResolvedValue(3);
    prisma.order.count.mockResolvedValue(1);
    prisma.order.aggregate.mockResolvedValue({ _sum: { subtotalClp: 80_000, totalClp: 80_000, commissionClp: 6_400 } });
    prisma.refund.count.mockResolvedValue(0);
    prisma.refund.aggregate.mockResolvedValue({ _count: { _all: 1 }, _sum: { amountClp: 5_000 } });
    prisma.payment.groupBy.mockResolvedValue([
      { status: "HELD", _count: { _all: 2 }, _sum: { amountClp: 120_000 } },
      { status: "RELEASED", _count: { _all: 1 }, _sum: { amountClp: 40_000 } },
    ]);
    prisma.payout.aggregate.mockResolvedValue({ _count: { _all: 1 }, _sum: { amountClp: 10_000 } });
    prisma.checkout.count.mockResolvedValue(0);
    prisma.webhookEvent.count.mockResolvedValue(0);
    prisma.$queryRaw.mockResolvedValue([{ count: 0n }]);
    prisma.payment.count.mockResolvedValue(0);
    prisma.payout.count.mockResolvedValue(0);
    prisma.reconciliationIssue.count.mockResolvedValue(0);
    prisma.jobRun.count.mockResolvedValue(0);
    prisma.dispute.count.mockResolvedValue(0);
    prisma.auditLog.count.mockResolvedValue(0);

    const dash = await service.dashboard(new Date("2026-08-20T15:00:00.000Z"));
    expect(dash.money.amountHeldClp).toBe(120_000);
    expect(dash.money.amountReleasedClp).toBe(40_000);
    expect(dash.money.collectedMpClp).toBe(160_000);
    expect(dash.money.paymentsHeld).toBe(2);
    expect(dash.money.refundsPendingClp).toBe(5_000);
    expect(dash.money.payoutsPendingClp).toBe(10_000);
    expect(dash.money.gmvTodayClp).toBe(80_000);
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it("paginates and filters orders by status", async () => {
    prisma.order.findMany.mockResolvedValue([]);
    prisma.order.count.mockResolvedValue(0);
    await service.listOrders({ page: 2, pageSize: 10, status: "DISPUTED" });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "DISPUTED" },
        skip: 10,
        take: 10,
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
