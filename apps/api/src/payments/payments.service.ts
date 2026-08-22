import { forwardRef, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@tcg/config";
import type { CheckoutView } from "@tcg/types";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { OrdersService } from "../orders/orders.service";
import { toCheckoutView } from "../orders/order.mapper";
import { claimWebhookEvent } from "./webhook-event";
import { MONEY_TX } from "../orders/checkout.lock";
import { PAYMENT_PROVIDER, type PaymentProvider, type ProviderPayment } from "./payment-provider";
import { RefundsService } from "./refunds.service";
import { assertMercadoPagoWebhookSignature } from "./webhook-signature";
import { MetricsService } from "../observability/metrics.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => OrdersService))
    private readonly orders: OrdersService,
    private readonly audit: AuditService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly refunds: RefundsService,
    private readonly metrics: MetricsService,
  ) {}

  mockEnabled(): boolean {
    return !this.provider.isConfigured();
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
      const created = await this.provider.getPreference(checkout.mercadoPagoPreferenceId);
      return {
        initPoint: created.initPoint,
        sandboxInitPoint: created.sandboxInitPoint,
        mock: false,
      };
    }

    const created = await this.provider.createPreference({
      checkoutId: checkout.id,
      totalClp: checkout.totalClp,
      notificationUrl: `${this.apiPublicUrl()}/v1/webhooks/mercadopago`,
      backUrl: `${this.webUrl()}/checkout/retorno?checkoutId=${checkout.id}`,
    });
    await this.orders.attachPreference(checkout.id, created.id);
    await this.audit.log({
      actorId,
      action: "payment.preference_created",
      entityType: "Checkout",
      entityId: checkout.id,
      metadata: { preferenceId: created.id },
    });
    return {
      initPoint: created.initPoint,
      sandboxInitPoint: created.sandboxInitPoint,
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
    try {
      this.verifySignature(headers, body);
    } catch (error) {
      this.metrics.inc("webhook_invalid_total");
      await this.audit.log({ action: "webhook.invalid", entityType: "WebhookEvent", metadata: {} });
      throw error;
    }
    this.verifySignature(headers, body);
    const payload = asRecord(body);
    const dataId = stringValue(asRecord(payload.data).id) ?? stringValue(payload.id);
    const eventId = stringValue(payload.id) ?? (dataId ? `payment:${dataId}` : undefined);
    if (!eventId) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        "Webhook Mercado Pago sin identificador",
      );
    }

    const type = stringValue(payload.type) ?? stringValue(payload.topic) ?? "";
    const isPayment = !type || type.includes("payment");
    const mpPayment = dataId && isPayment ? await this.provider.getPayment(dataId) : null;
    const checkoutId = mpPayment ? await this.resolveCheckoutId(mpPayment, payload) : null;

    await this.prisma.$transaction(async (tx) => {
      const claim = await claimWebhookEvent(tx, "MERCADOPAGO", eventId, payload as Prisma.InputJsonValue);
      if (claim.alreadyProcessed) {
        return;
      }

      if (mpPayment && checkoutId && isPayment) {
        const status = mpPayment.status ?? "";
        if (status === "approved") {
          this.metrics.inc("payment_approved_total");
          await this.orders.applyApprovedInTx(tx, checkoutId, mpPayment.id, toJson(mpPayment));
        } else if (status === "rejected" || status === "cancelled") {
          this.metrics.inc("payment_failed_total");
          await this.orders.applyRejectedInTx(tx, checkoutId, toJson(mpPayment));
        } else if (status === "refunded") {
          const checkout = await tx.checkout.findUnique({ where: { id: checkoutId }, select: { status: true } });
          if (checkout?.status === "PENDING_PAYMENT") {
            await this.orders.applyRejectedInTx(tx, checkoutId, toJson(mpPayment));
          } else {
            await this.refunds.syncProviderRefundedInTx(tx, checkoutId);
          }
        }
      }

      await tx.webhookEvent.update({
        where: { id: claim.id },
        data: { processedAt: new Date() },
      });
    }, MONEY_TX);

    if (checkoutId) {
      await this.refunds.executeOpenForCheckout(checkoutId);
    }
  }

  private async resolveCheckoutId(
    mpPayment: ProviderPayment,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    if (mpPayment.externalReference) return mpPayment.externalReference;
    if (this.mockEnabled()) {
      const fromPayload = stringValue(payload.external_reference);
      if (fromPayload) return fromPayload;
    }
    if (mpPayment.preferenceId) {
      return this.orders.findByPreferenceId(mpPayment.preferenceId);
    }
    return null;
  }

  private verifySignature(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): void {
    assertMercadoPagoWebhookSignature({
      mpConfigured: this.provider.isConfigured(),
      webhookSecret: this.config.get<string>("MP_WEBHOOK_SECRET"),
      headers,
      body,
    });
  }

  private webUrl(): string {
    return this.config.get<string>("APP_WEB_URL") ?? "http://localhost:3000";
  }

  private apiPublicUrl(): string {
    return this.config.get<string>("API_PUBLIC_URL") ?? "http://localhost:4000";
  }
}

function toJson(payment: ProviderPayment): Prisma.InputJsonValue {
  return payment.raw as Prisma.InputJsonValue;
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
