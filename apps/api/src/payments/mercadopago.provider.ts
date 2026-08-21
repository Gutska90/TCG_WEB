import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PaymentProviderError,
  type PaymentProvider,
  type ProviderPayment,
  type ProviderPreference,
  type ProviderRefundResult,
} from "./payment-provider";

const MP_API = "https://api.mercadopago.com";
const REFUND_TIMEOUT_MS = 10_000;

@Injectable()
export class MercadoPagoPaymentProvider implements PaymentProvider {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.accessToken());
  }

  async createPreference(input: {
    checkoutId: string;
    totalClp: number;
    notificationUrl: string;
    backUrl: string;
  }): Promise<ProviderPreference> {
    const created = await this.request<Record<string, unknown>>("POST", "/checkout/preferences", {
      items: [
        {
          title: "Compra TCG Platform",
          quantity: 1,
          unit_price: input.totalClp,
          currency_id: "CLP",
        },
      ],
      external_reference: input.checkoutId,
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.backUrl,
        failure: input.backUrl,
        pending: input.backUrl,
      },
      auto_return: "approved",
    });
    return this.toPreference(created);
  }

  async getPreference(preferenceId: string): Promise<ProviderPreference> {
    const created = await this.request<Record<string, unknown>>(
      "GET",
      `/checkout/preferences/${preferenceId}`,
    );
    return this.toPreference(created);
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const raw = await this.request<Record<string, unknown>>("GET", `/v1/payments/${providerPaymentId}`);
    return {
      id: stringValue(raw.id) ?? providerPaymentId,
      status: stringValue(raw.status),
      externalReference: stringValue(raw.external_reference),
      preferenceId: stringValue(raw.preference_id),
      raw,
    };
  }

  async refundPayment(input: {
    providerPaymentId: string;
    amountClp: number;
    idempotencyKey: string;
  }): Promise<ProviderRefundResult> {
    try {
      const raw = await this.request<Record<string, unknown>>(
        "POST",
        `/v1/payments/${input.providerPaymentId}/refunds`,
        { amount: input.amountClp },
        { "X-Idempotency-Key": input.idempotencyKey },
        REFUND_TIMEOUT_MS,
      );
      return this.toRefund(raw, input.amountClp);
    } catch (error) {
      if (error instanceof PaymentProviderError && error.code === "already_refunded") {
        const listed = await this.request<unknown>("GET", `/v1/payments/${input.providerPaymentId}/refunds`);
        const first = Array.isArray(listed) ? asRecord(listed[0]) : asRecord(listed);
        const id = stringValue(first.id);
        if (!id) {
          throw error;
        }
        return { id, status: "approved", amountClp: input.amountClp };
      }
      throw error;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
    timeoutMs?: number,
  ): Promise<T> {
    const token = this.accessToken();
    if (!token) {
      throw new PaymentProviderError("invalid", "Mercado Pago no está configurado");
    }
    try {
      const res = await fetch(`${MP_API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
      });
      const parsed: unknown = await res.json().catch(() => ({}));
      if (res.status === 404) {
        throw new PaymentProviderError("not_found", "Pago no encontrado en Mercado Pago", 404);
      }
      if (!res.ok) {
        const record = asRecord(parsed);
        if (isAlreadyRefunded(record, res.status)) {
          throw new PaymentProviderError("already_refunded", "El pago ya fue reembolsado", res.status);
        }
        throw new PaymentProviderError("http", "No se pudo hablar con Mercado Pago", res.status);
      }
      return parsed as T;
    } catch (error) {
      if (error instanceof PaymentProviderError) throw error;
      if (isAbort(error)) {
        throw new PaymentProviderError("timeout", "Timeout al hablar con Mercado Pago");
      }
      throw new PaymentProviderError("http", "No se pudo hablar con Mercado Pago");
    }
  }

  private accessToken(): string | undefined {
    const value = this.config.get<string>("MP_ACCESS_TOKEN")?.trim();
    return value ? value : undefined;
  }

  private toPreference(raw: Record<string, unknown>): ProviderPreference {
    return {
      id: stringValue(raw.id) ?? "",
      initPoint: stringValue(raw.init_point) ?? null,
      sandboxInitPoint: stringValue(raw.sandbox_init_point) ?? null,
    };
  }

  private toRefund(raw: Record<string, unknown>, amountClp: number): ProviderRefundResult {
    const statusRaw = stringValue(raw.status) ?? "pending";
    const status: ProviderRefundResult["status"] =
      statusRaw === "approved" ? "approved" : statusRaw === "rejected" ? "rejected" : "pending";
    const id = stringValue(raw.id);
    if (!id) {
      throw new PaymentProviderError("invalid", "Mercado Pago no devolvió id de reembolso");
    }
    return { id, status, amountClp };
  }
}

function isAlreadyRefunded(body: Record<string, unknown>, httpStatus: number): boolean {
  if (httpStatus !== 400 && httpStatus !== 409) return false;
  const blob = JSON.stringify(body).toLowerCase();
  return blob.includes("already") && blob.includes("refund");
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}
