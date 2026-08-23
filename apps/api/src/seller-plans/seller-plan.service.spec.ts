import { describe, expect, it, vi } from "vitest";
import { SellerPlanService } from "./seller-plan.service";

describe("SellerPlanService", () => {
  it("falls back to FREE without an active subscription", async () => {
    const prisma = {
      sellerSubscription: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const service = new SellerPlanService(prisma as never, { log: vi.fn() } as never);
    await expect(service.getEffectivePlan("seller-1", new Date())).resolves.toBe("FREE");
  });

  it("queries ACTIVE subscriptions covering the timestamp", async () => {
    const at = new Date("2026-06-01T00:00:00.000Z");
    const prisma = {
      sellerSubscription: { findFirst: vi.fn().mockResolvedValue({ plan: "SELLER_PRO" }) },
    };
    const service = new SellerPlanService(prisma as never, { log: vi.fn() } as never);
    await expect(service.getEffectivePlan("seller-1", at)).resolves.toBe("SELLER_PRO");
    expect(prisma.sellerSubscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          startsAt: { lte: at },
        }),
      }),
    );
  });
});
