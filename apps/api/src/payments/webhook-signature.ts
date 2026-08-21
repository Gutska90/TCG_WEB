import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpStatus } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { isPlaceholderSecret } from "../auth/jwt-secret";

export function assertMercadoPagoWebhookSignature(input: {
  mpConfigured: boolean;
  webhookSecret: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}): void {
  if (!input.mpConfigured) {
    throw new AppError(
      HttpStatus.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
      "Webhook Mercado Pago deshabilitado sin integración",
    );
  }
  const secret = input.webhookSecret?.trim();
  if (!secret || isPlaceholderSecret(secret)) {
    throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Webhook sin firma");
  }
  const signature = header(input.headers, "x-signature");
  const requestId = header(input.headers, "x-request-id");
  if (!signature || !requestId) {
    throw new AppError(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, "Firma inválida");
  }
  const ts = /ts=([^,]+)/.exec(signature)?.[1];
  const v1 = /v1=([^,]+)/.exec(signature)?.[1];
  const dataId = stringValue(asRecord(asRecord(input.body).data).id);
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

export function mercadoPagoWebhookHeaders(secret: string, dataId: string): Record<string, string> {
  const ts = "1710000000";
  const requestId = "it-request-id";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
  return {
    "x-signature": `ts=${ts},v1=${v1}`,
    "x-request-id": requestId,
  };
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
