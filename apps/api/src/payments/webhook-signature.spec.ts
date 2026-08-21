import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { assertMercadoPagoWebhookSignature, mercadoPagoWebhookHeaders } from "./webhook-signature";

const SECRET = "it-webhook-secret-not-a-placeholder-32";
const BODY = { id: "evt-1", type: "payment", data: { id: "pay-1" } };

function expectDenied(
  fn: () => void,
  status: number,
  code: string,
): void {
  try {
    fn();
    throw new Error("expected AppError");
  } catch (error) {
    expect(error).toMatchObject({ status, code });
  }
}

describe("assertMercadoPagoWebhookSignature", () => {
  it("rejects webhooks when Mercado Pago is not configured (mock)", () => {
    expectDenied(
      () =>
        assertMercadoPagoWebhookSignature({
          mpConfigured: false,
          webhookSecret: SECRET,
          headers: mercadoPagoWebhookHeaders(SECRET, "pay-1"),
          body: BODY,
        }),
      HttpStatus.FORBIDDEN,
      ERROR_CODES.FORBIDDEN,
    );
  });

  it("fails closed if MP is enabled but the webhook secret is missing", () => {
    expectDenied(
      () =>
        assertMercadoPagoWebhookSignature({
          mpConfigured: true,
          webhookSecret: undefined,
          headers: mercadoPagoWebhookHeaders(SECRET, "pay-1"),
          body: BODY,
        }),
      HttpStatus.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  });

  it("fails closed on placeholder webhook secrets even outside production", () => {
    expectDenied(
      () =>
        assertMercadoPagoWebhookSignature({
          mpConfigured: true,
          webhookSecret: "change-me",
          headers: {},
          body: BODY,
        }),
      HttpStatus.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  });

  it("rejects a bad signature", () => {
    expectDenied(
      () =>
        assertMercadoPagoWebhookSignature({
          mpConfigured: true,
          webhookSecret: SECRET,
          headers: { "x-signature": "ts=1,v1=deadbeef", "x-request-id": "r1" },
          body: BODY,
        }),
      HttpStatus.UNAUTHORIZED,
      ERROR_CODES.UNAUTHORIZED,
    );
  });

  it("accepts a valid Mercado Pago signature fixture", () => {
    expect(() =>
      assertMercadoPagoWebhookSignature({
        mpConfigured: true,
        webhookSecret: SECRET,
        headers: mercadoPagoWebhookHeaders(SECRET, "pay-1"),
        body: BODY,
      }),
    ).not.toThrow();
  });
});
