import type {
  PaymentProvider,
  ProviderPayment,
  ProviderPreference,
  ProviderRefundResult,
} from "../../../src/payments/payment-provider";
import { PaymentProviderError } from "../../../src/payments/payment-provider";

export type FakeRefundBehavior =
  | "ok"
  | "timeout"
  | "http"
  | "not_found"
  | "already_refunded"
  | "pending"
  | "fail_once";

export const MP_REFUND_APPROVED_FIXTURE = {
  id: 9001,
  payment_id: 7001,
  amount: 80000,
  status: "approved" as const,
};

export const MP_REFUND_PENDING_FIXTURE = {
  id: 9002,
  payment_id: 7001,
  amount: 80000,
  status: "in_process" as const,
};

export const MP_ALREADY_REFUNDED_FIXTURE = {
  status: 400,
  message: "The payment is already refunded",
};

export class FakePaymentProvider implements PaymentProvider {
  configured = false;
  paymentStatus = "approved";
  externalReference: string | undefined;
  refundBehavior: FakeRefundBehavior = "ok";
  refundCalls = 0;
  lastAmountClp: number | undefined;
  lastIdempotencyKey: string | undefined;

  isConfigured(): boolean {
    return this.configured;
  }

  async createPreference(): Promise<ProviderPreference> {
    return { id: "pref-fake", initPoint: "https://mp.test/init", sandboxInitPoint: null };
  }

  async getPreference(preferenceId: string): Promise<ProviderPreference> {
    return { id: preferenceId, initPoint: "https://mp.test/init", sandboxInitPoint: null };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    return {
      id: providerPaymentId,
      status: this.paymentStatus,
      externalReference: this.externalReference,
      raw: {
        id: providerPaymentId,
        status: this.paymentStatus,
        external_reference: this.externalReference,
        fixture: true,
      },
    };
  }

  async refundPayment(input: {
    providerPaymentId: string;
    amountClp: number;
    idempotencyKey: string;
  }): Promise<ProviderRefundResult> {
    this.refundCalls += 1;
    this.lastAmountClp = input.amountClp;
    this.lastIdempotencyKey = input.idempotencyKey;
    const behavior = this.refundBehavior;
    if (behavior === "fail_once") {
      this.refundBehavior = "ok";
      throw new PaymentProviderError("timeout", "Timeout al hablar con Mercado Pago");
    }
    if (behavior === "timeout") {
      throw new PaymentProviderError("timeout", "Timeout al hablar con Mercado Pago");
    }
    if (behavior === "http") {
      throw new PaymentProviderError("http", "No se pudo hablar con Mercado Pago", 500);
    }
    if (behavior === "not_found") {
      throw new PaymentProviderError("not_found", "Pago no encontrado en Mercado Pago", 404);
    }
    if (behavior === "pending") {
      return {
        id: String(MP_REFUND_PENDING_FIXTURE.id),
        status: "pending",
        amountClp: input.amountClp,
      };
    }
    if (behavior === "already_refunded") {
      return {
        id: String(MP_REFUND_APPROVED_FIXTURE.id),
        status: "approved",
        amountClp: input.amountClp,
      };
    }
    return {
      id: `mock_rf_${input.idempotencyKey}`,
      status: "approved",
      amountClp: input.amountClp,
    };
  }
}
