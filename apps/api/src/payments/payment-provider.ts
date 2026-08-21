export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");

export type ProviderPreference = {
  id: string;
  initPoint: string | null;
  sandboxInitPoint: string | null;
};

export type ProviderPayment = {
  id: string;
  status?: string;
  externalReference?: string;
  preferenceId?: string;
  raw: Record<string, unknown>;
};

export type ProviderRefundResult = {
  id: string;
  status: "approved" | "pending" | "rejected";
  amountClp: number;
};

export type PaymentProviderErrorCode = "timeout" | "http" | "not_found" | "already_refunded" | "invalid";

export class PaymentProviderError extends Error {
  readonly code: PaymentProviderErrorCode;
  readonly httpStatus?: number;

  constructor(code: PaymentProviderErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "PaymentProviderError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface PaymentProvider {
  isConfigured(): boolean;
  createPreference(input: {
    checkoutId: string;
    totalClp: number;
    notificationUrl: string;
    backUrl: string;
  }): Promise<ProviderPreference>;
  getPreference(preferenceId: string): Promise<ProviderPreference>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refundPayment(input: {
    providerPaymentId: string;
    amountClp: number;
    idempotencyKey: string;
  }): Promise<ProviderRefundResult>;
}
