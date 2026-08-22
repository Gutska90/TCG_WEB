import type {
  PaymentProvider,
  PaymentSearchRange,
  ProviderPayment,
  ProviderPreference,
  ProviderRefund,
  ProviderRefundResult,
} from "./payment-provider";
import { PaymentProviderError } from "./payment-provider";

/**
 * Local-only stand-in when `MP_ACCESS_TOKEN` is empty and `NODE_ENV !== production`.
 * Never used by `MercadoPagoPaymentProvider`. Production always binds the real provider.
 */
export class LocalPaymentProvider implements PaymentProvider {
  isConfigured(): boolean {
    return false;
  }

  async createPreference(): Promise<ProviderPreference> {
    throw new PaymentProviderError("invalid", "Mercado Pago no está configurado");
  }

  async getPreference(): Promise<ProviderPreference> {
    throw new PaymentProviderError("invalid", "Mercado Pago no está configurado");
  }

  async getPayment(): Promise<ProviderPayment> {
    throw new PaymentProviderError("invalid", "Mercado Pago no está configurado");
  }

  async refundPayment(input: {
    providerPaymentId: string;
    amountClp: number;
    idempotencyKey: string;
  }): Promise<ProviderRefundResult> {
    return {
      id: `local_rf_${input.idempotencyKey}`,
      status: "approved",
      amountClp: input.amountClp,
    };
  }

  async searchPayments(_range: PaymentSearchRange): Promise<ProviderPayment[]> {
    return [];
  }

  async listRefunds(_providerPaymentId: string): Promise<ProviderRefund[]> {
    return [];
  }
}
