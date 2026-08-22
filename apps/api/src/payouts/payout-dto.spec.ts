import { describe, expect, it } from "vitest";
import { createAdminPayoutSchema, adminMarkPayoutPaidSchema, adminLedgerAdjustmentSchema } from "@tcg/validation";

const sellerId = "11111111-1111-4111-8111-111111111111";

describe("admin payout DTOs", () => {
  it("rejects amountClp and commissionClp from the client", () => {
    expect(
      createAdminPayoutSchema.safeParse({ sellerId, amountClp: 10_000 }).success,
    ).toBe(false);
    expect(
      createAdminPayoutSchema.safeParse({ sellerId, commissionClp: 800 }).success,
    ).toBe(false);
    expect(createAdminPayoutSchema.safeParse({ sellerId }).success).toBe(true);
  });

  it("requires providerRef to mark paid", () => {
    expect(adminMarkPayoutPaidSchema.safeParse({}).success).toBe(false);
    expect(adminMarkPayoutPaidSchema.safeParse({ providerRef: "" }).success).toBe(false);
    expect(adminMarkPayoutPaidSchema.safeParse({ providerRef: "TRX-1" }).success).toBe(true);
  });

  it("requires reason and nonzero amount for adjustments", () => {
    expect(adminLedgerAdjustmentSchema.safeParse({ sellerId, amountClp: 1 }).success).toBe(false);
    expect(
      adminLedgerAdjustmentSchema.safeParse({ sellerId, amountClp: 0, reason: "ajuste" }).success,
    ).toBe(false);
    expect(
      adminLedgerAdjustmentSchema.safeParse({ sellerId, amountClp: -500, reason: "correccion" }).success,
    ).toBe(true);
  });
});
