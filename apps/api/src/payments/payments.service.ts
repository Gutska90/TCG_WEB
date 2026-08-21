import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ERROR_CODES } from "@tcg/config";
import type { CheckoutView } from "@tcg/types";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OrdersService } from "../orders/orders.service";
import { toCheckoutView } from "../orders/order.mapper";

type MpPreference = {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
  ) {}

  mockEnabled(): boolean {
    return !this.accessToken();
  }

  async decorate(checkoutId: string): Promise<CheckoutView["mercadopago"]> {
    const checkout = await this.orders.getCheckoutRecord(checkoutId);
    if (!checkout) {
      return { initPoint: null, sandboxInitPoint: null, mock: this.mockEnabled() };
    }
    if (this.mockEnabled()) {
      return { initPoint: null, sandboxInitPoint: null, mock: true };
    }
    if (checkout.mercadoPagoPreferenceId) {
      return {
        initPoint: `${this.webUrl()}/checkout/retorno?checkoutId=${checkout.id}`,
        sandboxInitPoint: null,
        mock: false,
      };
    }
    return { initPoint: null, sandboxInitPoint: null, mock: false };
  }

  async ensurePreference(actorId: string, checkoutId: string): Promise<CheckoutView> {
    const mp = await this.createPreference(checkoutId, actorId);
    const checkout = await this.orders.getCheckoutRecord(checkoutId);
    if (!checkout || checkout.buyerId !== actorId) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Checkout no encontrado");
    }
    return toCheckoutView(checkout, mp);
  }

  async createPreference(checkoutId: string, actorId: string): Promise<CheckoutView["mercadopago"]> {
    const checkout = await this.orders.getCheckoutRecord(checkoutId);
    if (!checkout || checkout.buyerId !== actorId) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Checkout no encontrado");
    }
    if (checkout.status !== "PENDING_PAYMENT") {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CHECKOUT_EXPIRED, "El checkout no admite pago");
    }
    if (checkout.expiresAt <= new Date()) {
      throw new AppError(HttpStatus.CONFLICT, ERROR_CODES.CHECKOUT_EXPIRED, "El checkout expiró");
    }
    await this.orders.ensurePendingPayments(checkoutId);
    if (this.mockEnabled()) {
      return { initPoint: null, sandboxInitPoint: null, mock: true };
    }
    if (checkout.mercadoPagoPreferenceId) {
      const created = await this.mpRequest<MpPreference>(
        "GET",
        `/checkout/preferences/${checkout.mercadoPagoPreferenceId}`,
      );
      return {
        initPoint: created.init_point ?? null,
        sandboxInitPoint: created.sandbox_init_point ?? null,
        mock: false,
      };
    }

    const body = {
      items: [
        {
          title: "Compra TCG Platform",
          quantity: 1,
          unit_price: checkout.totalClp,
          currency_id: "CLP",
        },
      ],
      external_reference: checkout.id,
      notification_url: `${this.apiPublicUrl()}/v1/webhooks/mercadopago`,
      back_urls: {
        success: `${this.webUrl()}/checkout/retorno?checkoutId=${checkout.id}`,
        failure: `${this.webUrl()}/checkout/retorno?checkoutId=${checkout.id}`,
        pending: `${this.webUrl()}/checkout/retorno?checkoutId=${checkout.id}`,
      },
      auto_return: "approved",
    };
    const created = await this.mpRequest<MpPreference>("POST", "/checkout/preferences", body);
    await this.orders.attachPreference(checkout.id, created.id);
    await this.audit.log({
      actorId,
      action: "payment.preference_created",
      entityType: "Checkout",
      entityId: checkout.id,
      metadata: { preferenceId: created.id },
    });
    return {
      initPoint: created.init_point ?? null,
      sandboxInitPoint: created.sandbox_init_point ?? null,
      mock: false,
    };
  }

  async simulate(actorId: string, checkoutId: string): Promise<CheckoutView> {
    if (!this.mockEnabled()) {
      throw new AppError(
        HttpStatus.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        "El pago simulado solo existe sin Mercado Pago configurado",
      );
    }
    const checkout = await this.orders.getCheckoutRecord(checkoutId);
    if (!checkout || checkout.buyerId !== actorId) {
      throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Checkout no encontrado");
    }
    await this.orders.applyApproved(checkoutId, `mock_${checkoutId}`, { mock: true });
    return this.orders.getCheckout(
      {
        id: actorId,
        email: "",
        roles: ["USER"],
        sessionId: "",
        emailVerified: true,
        tokenVersion: 0,
      },
      checkoutId,
      { initPoint: null, sandboxInitPoint: null, mock: true },
    );
  }

  async handleWebhook(headers: Record<string, string | string[] | undefined>, body: unknown): Promise<void> {
    this.verifySignature(headers, body);
    const payload = asRecord(body);
    const eventId =
      stringValue(payload.id) ??
      stringValue(payload.data) ??
      `${stringValue(payload.type) ?? "mp"}:${stringValue(asRecord(payload.data).id) ?? Date.now()}`;
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { provider_providerEventId: { provider: "MERCADOPAGO", providerEventId: eventId } },
    });
    if (existing?.processedAt) return;

    const event = existing
      ? existing
      : await this.prisma.webhookEvent.create({
          data: { provider: "MERCADOPAGO", providerEventId: eventId, payload: payload as object },
        });

    const type = stringValue(payload.type) ?? stringValue(payload.topic) ?? "";
    const dataId = stringValue(asRecord(payload.data).id) ?? stringValue(payload.id);
    if (!dataId || (type && !type.includes("payment"))) {
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
      return;
    }

    const payment = await this.fetchMpPayment(dataId);
    const checkoutId =
      payment.external_reference ??
      (payment.preference_id ? await this.orders.findByPreferenceId(payment.preference_id) : null);
    if (!checkoutId) {
      await this.prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
      return;
    }

    const status = payment.status ?? "";
    if (status === "approved") {
      // Money stays HELD until the buyer confirms delivery. Never payout here.
      await this.orders.applyApproved(checkoutId, payment.id, payment);
    } else if (status === "rejected" || status === "cancelled" || status === "refunded") {
      await this.orders.applyRejected(checkoutId, payment);
    }

    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });
  }

  private verifySignature(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): void {
    const secret = this.config.get<string>("MP_WEBHOOK_SECRET")?.trim();
    if (!secret) {
      if (process.env.NODE_ENV === "production") {
        throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Webhook sin firma");
      }
      return;
    }
    const signature = header(headers, "x-signature");
    const requestId = header(headers, "x-request-id");
    if (!signature || !requestId) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Firma inválida");
    }
    const ts = /ts=([^,]+)/.exec(signature)?.[1];
    const v1 = /v1=([^,]+)/.exec(signature)?.[1];
    const dataId = stringValue(asRecord(asRecord(body).data).id);
    if (!ts || !v1 || !dataId) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Firma inválida");
    }
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = createHmac("sha256", secret).update(manifest).digest("hex");
    const a = Buffer.from(v1);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Firma inválida");
    }
  }

  private async fetchMpPayment(id: string): Promise<{
    id: string;
    status?: string;
    external_reference?: string;
    preference_id?: string;
  }> {
    if (this.mockEnabled()) {
      return { id, status: "approved", external_reference: undefined };
    }
    return this.mpRequest(`GET`, `/v1/payments/${id}`);
  }

  private async mpRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = this.accessToken();
    if (!token) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "Mercado Pago no está configurado");
    }
    const res = await fetch(`https://api.mercadopago.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw new AppError(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, "No se pudo hablar con Mercado Pago");
    }
    return (await res.json()) as T;
  }

  private accessToken(): string | undefined {
    const value = this.config.get<string>("MP_ACCESS_TOKEN")?.trim();
    return value ? value : undefined;
  }

  private webUrl(): string {
    return this.config.get<string>("APP_WEB_URL") ?? "http://localhost:3000";
  }

  private apiPublicUrl(): string {
    return this.config.get<string>("API_PUBLIC_URL") ?? "http://localhost:4000";
  }
}

function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
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
