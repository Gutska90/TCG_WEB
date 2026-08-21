import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { MercadoPagoPaymentProvider } from "./mercadopago.provider";
import { PaymentProviderError } from "./payment-provider";

describe("MercadoPagoPaymentProvider.refundPayment", () => {
  const provider = new MercadoPagoPaymentProvider({
    get: (key: string) => (key === "MP_ACCESS_TOKEN" ? "test-token" : undefined),
  } as ConfigService);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps an approved MP refund fixture", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 9001, payment_id: 7001, amount: 80000, status: "approved" }),
      }),
    );
    const result = await provider.refundPayment({
      providerPaymentId: "7001",
      amountClp: 80000,
      idempotencyKey: "refund-1",
    });
    expect(result).toEqual({ id: "9001", status: "approved", amountClp: 80000 });
    const call = vi.mocked(fetch).mock.calls[0];
    expect(String(call?.[0])).toContain("/v1/payments/7001/refunds");
    expect((call?.[1] as RequestInit).headers).toMatchObject({
      "X-Idempotency-Key": "refund-1",
    });
  });

  it("treats already-refunded as success using the existing refund id", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ message: "The payment is already refunded" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [{ id: 9001, status: "approved" }],
        }),
    );
    const result = await provider.refundPayment({
      providerPaymentId: "7001",
      amountClp: 80000,
      idempotencyKey: "refund-1",
    });
    expect(result.id).toBe("9001");
    expect(result.status).toBe("approved");
  });

  it("maps timeout to PaymentProviderError", async () => {
    const abort = new Error("Aborted");
    abort.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abort));
    await expect(
      provider.refundPayment({ providerPaymentId: "7001", amountClp: 80000, idempotencyKey: "refund-1" }),
    ).rejects.toMatchObject({ code: "timeout" } satisfies Partial<PaymentProviderError>);
  });

  it("maps 404 to not_found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: "not found" }),
      }),
    );
    await expect(
      provider.refundPayment({ providerPaymentId: "missing", amountClp: 80000, idempotencyKey: "refund-1" }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
