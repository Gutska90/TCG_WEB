import { describe, expect, it } from "vitest";
import {
  compareLedger,
  comparePayments,
  compareRefunds,
  issueFingerprint,
  paymentStatusCompatible,
} from "./recon-rules";

const payment = {
  id: "pay-1",
  status: "HELD" as const,
  amountClp: 80_000,
  providerPaymentId: "mp-1",
  checkoutId: "chk-1",
  orderId: "ord-1",
  orderStatus: "PAID" as const,
};

describe("recon-rules", () => {
  it("maps MP approved to HELD or RELEASED", () => {
    expect(paymentStatusCompatible("approved", "HELD")).toBe(true);
    expect(paymentStatusCompatible("approved", "RELEASED")).toBe(true);
    expect(paymentStatusCompatible("approved", "REFUNDED")).toBe(false);
    expect(paymentStatusCompatible("refunded", "HELD")).toBe(false);
    expect(paymentStatusCompatible("refunded", "REFUNDED")).toBe(true);
  });

  it("flags missing local, missing provider, status and amount", () => {
    const issues = comparePayments({
      local: [payment],
      provider: [
        { id: "mp-1", status: "refunded", amountClp: 70_000, raw: {} },
        { id: "mp-orphan", status: "approved", amountClp: 10, externalReference: "chk-1", raw: {} },
        { id: "mp-unknown", status: "approved", amountClp: 10, raw: {} },
      ],
      knownCheckoutIds: new Set(["chk-1"]),
      providerConfigured: true,
    });
    const types = issues.map((row) => row.issueType).sort();
    expect(types).toEqual([
      "PAYMENT_AMOUNT_MISMATCH",
      "PAYMENT_MISSING_LOCAL",
      "PAYMENT_STATUS_MISMATCH",
      "UNKNOWN_PROVIDER_PAYMENT",
    ]);
  });

  it("does not duplicate OPEN fingerprints for the same mismatch", () => {
    const [first] = comparePayments({
      local: [{ ...payment, status: "REFUNDED" }],
      provider: [{ id: "mp-1", status: "approved", amountClp: 80_000, raw: {} }],
      knownCheckoutIds: new Set(["chk-1"]),
      providerConfigured: true,
    });
    const [second] = comparePayments({
      local: [{ ...payment, status: "REFUNDED" }],
      provider: [{ id: "mp-1", status: "approved", amountClp: 80_000, raw: {} }],
      knownCheckoutIds: new Set(["chk-1"]),
      providerConfigured: true,
    });
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) return;
    expect(issueFingerprint(first)).toBe(issueFingerprint(second));
  });

  it("flags refund mismatches", () => {
    const issues = compareRefunds({
      local: [
        {
          id: "rf-local",
          paymentId: "pay-1",
          status: "COMPLETED",
          amountClp: 80_000,
          providerRefundId: "rf-1",
          providerPaymentId: "mp-1",
        },
      ],
      provider: [
        { id: "rf-1", providerPaymentId: "mp-1", status: "approved", amountClp: 10 },
        { id: "rf-orphan", providerPaymentId: "mp-1", status: "approved", amountClp: 5 },
      ],
    });
    expect(issues.map((row) => row.issueType).sort()).toEqual([
      "REFUND_AMOUNT_MISMATCH",
      "REFUND_MISSING_LOCAL",
    ]);
  });

  it("flags missing ledger rows without mutating anything", () => {
    const issues = compareLedger({
      payments: [
        { ...payment, status: "RELEASED", orderStatus: "COMPLETED" },
      ],
      refunds: [
        {
          id: "rf-1",
          paymentId: "pay-1",
          status: "COMPLETED",
          amountClp: 80_000,
          providerRefundId: null,
          providerPaymentId: "mp-1",
        },
      ],
      payouts: [{ id: "po-1", status: "PAID" }],
      ledger: {
        paymentCaptured: new Set(),
        sellerPayable: new Set(),
        refund: new Set(),
        payoutPaid: new Set(),
      },
    });
    expect(issues.map((row) => row.issueType).sort()).toEqual([
      "LEDGER_MISSING_PAYMENT_CAPTURED",
      "LEDGER_MISSING_REFUND",
      "LEDGER_MISSING_SELLER_PAYABLE",
      "PAYOUT_LEDGER_MISMATCH",
    ]);
  });
});
