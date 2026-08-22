import { describe, expect, it } from "vitest";
import { deriveSellerBalance } from "./seller-balance.service";

describe("deriveSellerBalance", () => {
  const sellerId = "seller-1";

  it("keeps captured funds pending until SELLER_PAYABLE", () => {
    const balance = deriveSellerBalance(sellerId, [
      { entryType: "PAYMENT_CAPTURED", amountClp: 73_600, orderId: "o1" },
    ]);
    expect(balance).toMatchObject({
      pendingClp: 73_600,
      availableClp: 0,
      reservedClp: 0,
      paidClp: 0,
      netClp: 73_600,
    });
  });

  it("moves net to available on release", () => {
    const balance = deriveSellerBalance(sellerId, [
      { entryType: "PAYMENT_CAPTURED", amountClp: 73_600, orderId: "o1" },
      { entryType: "SELLER_PAYABLE", amountClp: 73_600, orderId: "o1" },
    ]);
    expect(balance).toMatchObject({
      pendingClp: 0,
      availableClp: 73_600,
      reservedClp: 0,
      paidClp: 0,
      netClp: 73_600,
    });
  });

  it("does not credit seller when refund happens before payable", () => {
    const balance = deriveSellerBalance(sellerId, [
      { entryType: "PAYMENT_CAPTURED", amountClp: 73_600, orderId: "o1" },
      { entryType: "REFUND", amountClp: -73_600, orderId: "o1" },
    ]);
    expect(balance.pendingClp).toBe(0);
    expect(balance.availableClp).toBe(0);
    expect(balance.netClp).toBe(0);
  });

  it("reduces available when refund happens after payable and before payout", () => {
    const balance = deriveSellerBalance(sellerId, [
      { entryType: "PAYMENT_CAPTURED", amountClp: 73_600, orderId: "o1" },
      { entryType: "SELLER_PAYABLE", amountClp: 73_600, orderId: "o1" },
      { entryType: "REFUND", amountClp: -73_600, orderId: "o1" },
    ]);
    expect(balance.availableClp).toBe(0);
    expect(balance.netClp).toBe(0);
  });

  it("shows seller debt after refund post paid payout", () => {
    const balance = deriveSellerBalance(sellerId, [
      { entryType: "PAYMENT_CAPTURED", amountClp: 73_600, orderId: "o1" },
      { entryType: "SELLER_PAYABLE", amountClp: 73_600, orderId: "o1" },
      { entryType: "PAYOUT_RESERVED", amountClp: -73_600, orderId: null },
      { entryType: "PAYOUT_PAID", amountClp: 73_600, orderId: null },
      { entryType: "REFUND", amountClp: -73_600, orderId: "o1" },
    ]);
    expect(balance.availableClp).toBe(-73_600);
    expect(balance.reservedClp).toBe(0);
    expect(balance.paidClp).toBe(73_600);
    expect(balance.netClp).toBe(-73_600);
  });
});
