import { describe, expect, it, vi } from "vitest";
import { MarketplaceFeeService } from "./marketplace-fee.service";

describe("MarketplaceFeeService", () => {
  it("quotes with the effective plan from SellerPlanService", async () => {
    const plans = {
      getEffectivePlan: vi.fn().mockResolvedValue("SELLER_PLUS"),
    };
    const metrics = { add: vi.fn() };
    const service = new MarketplaceFeeService(plans as never, metrics as never);
    const quote = await service.calculate({
      sellerId: "seller-1",
      orderSubtotalClp: 30_000,
      at: new Date("2026-06-01T00:00:00.000Z"),
    });
    expect(plans.getEffectivePlan).toHaveBeenCalledWith(
      "seller-1",
      new Date("2026-06-01T00:00:00.000Z"),
      undefined,
    );
    expect(quote.planCode).toBe("SELLER_PLUS");
    expect(quote.platformFeeClp).toBe(1_350);
    expect(quote.sellerPayableBeforeProcessorClp).toBe(28_650);
  });
});
