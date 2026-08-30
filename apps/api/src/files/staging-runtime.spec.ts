import { describe, expect, it } from "vitest";
import {
  assertErrorTrackingConfig,
  assertStagingRuntimeDeps,
  collectStagingOperatorReport,
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

describe("collectStagingOperatorReport", () => {
  it("flags the committed staging example as not ready for testers", () => {
    const report = collectStagingOperatorReport({
      NODE_ENV: "staging",
      APP_ENV: "staging",
      DATABASE_URL: "",
      JWT_ACCESS_SECRET: "",
      APP_WEB_URL: "https://staging.example.test",
      APP_ADMIN_URL: "https://admin.staging.example.test",
      API_PUBLIC_URL: "https://api.staging.example.test",
      CORS_ORIGINS: "https://staging.example.test,https://admin.staging.example.test",
      ENABLE_REAL_PAYMENTS: "false",
      AUTH_STUB_OAUTH: "false",
    });
    expect(report.blockers.some((row) => /object storage/i.test(row))).toBe(true);
    expect(report.blockers.some((row) => /RESEND_API_KEY or SMTP_HOST/i.test(row))).toBe(true);
    expect(report.blockers.some((row) => /JWT_ACCESS_SECRET/i.test(row))).toBe(true);
    expect(report.warnings.some((row) => /placeholder/i.test(row))).toBe(true);
  });

  it("passes a filled staging contract", () => {
    const report = collectStagingOperatorReport({
      NODE_ENV: "staging",
      APP_ENV: "staging",
      DATABASE_URL: "postgresql://tcg:tcg@db/tcg_platform",
      JWT_ACCESS_SECRET: "a".repeat(32),
      APP_WEB_URL: "https://staging.tcg.cl",
      APP_ADMIN_URL: "https://admin.staging.tcg.cl",
      API_PUBLIC_URL: "https://api.staging.tcg.cl",
      CORS_ORIGINS: "https://staging.tcg.cl,https://admin.staging.tcg.cl",
      ADMIN_IP_ALLOWLIST: "203.0.113.10",
      R2_ACCOUNT_ID: "acct",
      R2_ACCESS_KEY_ID: "id",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "tcg-files",
      RESEND_API_KEY: "re_test",
      ENABLE_REAL_PAYMENTS: "false",
      AUTH_STUB_OAUTH: "false",
      ENABLE_SCANNER: "false",
      SHOW_SYNTHETIC_CATALOG: "false",
      API_ORIGIN: "https://api.staging.tcg.cl",
      LEGAL_CONTACT_EMAIL: "soporte@staging.tcg.cl",
      LEGAL_PRIVACY_EMAIL: "privacidad@staging.tcg.cl",
    });
    expect(report.blockers).toEqual([]);
    expect(report.warnings.some((row) => /API_ORIGIN/i.test(row))).toBe(false);
  });

  it("warns when staging still shows the synthetic showcase catalog", () => {
    const report = collectStagingOperatorReport({
      NODE_ENV: "staging",
      APP_ENV: "staging",
      DATABASE_URL: "postgresql://tcg:tcg@db/tcg_platform",
      JWT_ACCESS_SECRET: "a".repeat(32),
      APP_WEB_URL: "https://staging.tcg.cl",
      APP_ADMIN_URL: "https://admin.staging.tcg.cl",
      API_PUBLIC_URL: "https://api.staging.tcg.cl",
      CORS_ORIGINS: "https://staging.tcg.cl,https://admin.staging.tcg.cl",
      ADMIN_IP_ALLOWLIST: "203.0.113.10",
      R2_ACCOUNT_ID: "acct",
      R2_ACCESS_KEY_ID: "id",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "tcg-files",
      RESEND_API_KEY: "re_test",
      ENABLE_REAL_PAYMENTS: "false",
      AUTH_STUB_OAUTH: "false",
      SHOW_SYNTHETIC_CATALOG: "true",
      LEGAL_CONTACT_EMAIL: "soporte@staging.tcg.cl",
      LEGAL_PRIVACY_EMAIL: "privacidad@staging.tcg.cl",
    });
    expect(report.blockers).toEqual([]);
    expect(report.warnings.some((row) => /Synthetic showcase catalog is visible/i.test(row))).toBe(true);
  });

  it("warns when staging Next would fall back to localhost API_ORIGIN", () => {
    const report = collectStagingOperatorReport({
      NODE_ENV: "staging",
      APP_ENV: "staging",
      DATABASE_URL: "postgresql://tcg:tcg@db/tcg_platform",
      JWT_ACCESS_SECRET: "a".repeat(32),
      APP_WEB_URL: "https://staging.tcg.cl",
      APP_ADMIN_URL: "https://admin.staging.tcg.cl",
      API_PUBLIC_URL: "https://api.staging.tcg.cl",
      CORS_ORIGINS: "https://staging.tcg.cl,https://admin.staging.tcg.cl",
      ADMIN_IP_ALLOWLIST: "203.0.113.10",
      R2_ACCOUNT_ID: "acct",
      R2_ACCESS_KEY_ID: "id",
      R2_SECRET_ACCESS_KEY: "secret",
      R2_BUCKET: "tcg-files",
      RESEND_API_KEY: "re_test",
      ENABLE_REAL_PAYMENTS: "false",
      AUTH_STUB_OAUTH: "false",
      SHOW_SYNTHETIC_CATALOG: "false",
      LEGAL_CONTACT_EMAIL: "soporte@staging.tcg.cl",
      LEGAL_PRIVACY_EMAIL: "privacidad@staging.tcg.cl",
    });
    expect(report.warnings.some((row) => /API_ORIGIN is empty/i.test(row))).toBe(true);
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
