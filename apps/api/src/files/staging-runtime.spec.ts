import { describe, expect, it } from "vitest";
import {
  assertErrorTrackingConfig,
  assertStagingRuntimeDeps,
  mailDeliveryConfigured,
  objectStorageConfigured,
} from "@tcg/config";

describe("assertStagingRuntimeDeps", () => {
  it("allows local without storage or mail", () => {
    expect(() => assertStagingRuntimeDeps({ NODE_ENV: "development" })).not.toThrow();
    expect(objectStorageConfigured({})).toBe(false);
    expect(mailDeliveryConfigured({})).toBe(false);
  });

  it("fails staging without object storage", () => {
    expect(() =>
      assertStagingRuntimeDeps({
        NODE_ENV: "staging",
        SMTP_HOST: "127.0.0.1",
      }),
    ).toThrow(/object storage/);
  });

  it("fails staging without mail", () => {
    expect(() =>
      assertStagingRuntimeDeps({
        NODE_ENV: "staging",
        S3_ENDPOINT: "http://127.0.0.1:9100",
        S3_ACCESS_KEY_ID: "tcg",
        S3_SECRET_ACCESS_KEY: "tcgminio12",
        S3_BUCKET: "tcg-files",
      }),
    ).toThrow(/RESEND_API_KEY or SMTP_HOST/);
  });

  it("forbids real payments in staging", () => {
    expect(() =>
      assertStagingRuntimeDeps({
        NODE_ENV: "staging",
        S3_ENDPOINT: "http://127.0.0.1:9100",
        S3_ACCESS_KEY_ID: "tcg",
        S3_SECRET_ACCESS_KEY: "tcgminio12",
        S3_BUCKET: "tcg-files",
        RESEND_API_KEY: "re_test",
        ENABLE_REAL_PAYMENTS: "true",
      }),
    ).toThrow(/ENABLE_REAL_PAYMENTS/);
  });

  it("accepts R2 + Resend in production", () => {
    expect(() =>
      assertStagingRuntimeDeps({
        NODE_ENV: "production",
        R2_ACCOUNT_ID: "acct",
        R2_ACCESS_KEY_ID: "id",
        R2_SECRET_ACCESS_KEY: "secret",
        R2_BUCKET: "tcg-files",
        RESEND_API_KEY: "re_live",
        ENABLE_REAL_PAYMENTS: "false",
      }),
    ).not.toThrow();
  });
});

describe("assertErrorTrackingConfig", () => {
  it("allows tracking off without DSN", () => {
    expect(() => assertErrorTrackingConfig({ ERROR_TRACKING_ENABLED: "false" })).not.toThrow();
    expect(() => assertErrorTrackingConfig({})).not.toThrow();
  });

  it("requires SENTRY_DSN when tracking is on", () => {
    expect(() => assertErrorTrackingConfig({ ERROR_TRACKING_ENABLED: "true" })).toThrow(/SENTRY_DSN/);
  });

  it("accepts enabled + DSN", () => {
    expect(() =>
      assertErrorTrackingConfig({
        ERROR_TRACKING_ENABLED: "true",
        SENTRY_DSN: "https://key@o0.ingest.sentry.io/1",
      }),
    ).not.toThrow();
  });
});
