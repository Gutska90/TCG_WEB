import { describe, expect, it } from "vitest";
import { ERROR_CODES, loadFeatureFlags } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { flagsForTest } from "../flags/feature-flags.service";
import { JobScheduler } from "../jobs/job-scheduler";
import { redactRecord } from "./redact";
import { currentRequestId, resolveRequestId, runWithRequestContext } from "./request-context";

describe("request id", () => {
  it("accepts a valid UUID from the proxy", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(resolveRequestId(id)).toBe(id);
  });

  it("generates a UUID when the header is missing or invalid", () => {
    expect(resolveRequestId(undefined)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(resolveRequestId("not-a-uuid")).not.toBe("not-a-uuid");
  });

  it("propagates the id inside async context", () => {
    const id = resolveRequestId(undefined);
    runWithRequestContext({ requestId: id, userId: "u1" }, () => {
      expect(currentRequestId()).toBe(id);
    });
  });
});

describe("redaction", () => {
  it("redacts secrets and tokens", () => {
    const out = redactRecord({
      password: "secret",
      passwordHash: "argon",
      authorization: "Bearer abc.def",
      MP_ACCESS_TOKEN: "APP_USR-xxx",
      MP_WEBHOOK_SECRET: "whsec",
      jwt: "eyJhbGciOi",
      idToken: "ya29.google",
      identityToken: "apple.jwt",
      refreshToken: "opaque-refresh",
      checkoutId: "chk-1",
    });
    expect(out.password).toBe("[REDACTED]");
    expect(out.passwordHash).toBe("[REDACTED]");
    expect(out.authorization).toBe("[REDACTED]");
    expect(out.MP_ACCESS_TOKEN).toBe("[REDACTED]");
    expect(out.MP_WEBHOOK_SECRET).toBe("[REDACTED]");
    expect(out.jwt).toBe("[REDACTED]");
    expect(out.idToken).toBe("[REDACTED]");
    expect(out.identityToken).toBe("[REDACTED]");
    expect(out.refreshToken).toBe("[REDACTED]");
    expect(out.checkoutId).toBe("chk-1");
  });
});

describe("feature flags and kill switches", () => {
  it("keeps scanner and later features off by default", () => {
    const flags = loadFeatureFlags({ NODE_ENV: "test" });
    expect(flags.enableCollections).toBe(true);
    expect(flags.enablePrices).toBe(true);
    expect(flags.enableWishlist).toBe(true);
    expect(flags.enableScanner).toBe(false);
    expect(flags.enableStores).toBe(false);
    expect(flags.enableAuctions).toBe(false);
    expect(flags.enableGoogleAuth).toBe(false);
    expect(flags.enableAppleAuth).toBe(false);
    expect(flags.authStubOauth).toBe(false);
    expect(flags.showSyntheticCatalog).toBe(true);
    expect(flags.enableRealPayments).toBe(false);
    expect(flags.errorTrackingEnabled).toBe(false);
    expect(flags.refundRetryJobEnabled).toBe(false);
  });

  it("blocks checkout with DISABLE_CHECKOUT", () => {
    const flags = flagsForTest({ disableCheckout: true });
    expect(() => flags.assertCheckoutAllowed()).toThrow(AppError);
    try {
      flags.assertCheckoutAllowed();
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.SERVICE_TEMPORARILY_DISABLED });
    }
  });

  it("blocks new listings with DISABLE_NEW_LISTINGS", () => {
    const flags = flagsForTest({ disableNewListings: true });
    expect(() => flags.assertNewListingsAllowed()).toThrow(AppError);
  });

  it("blocks payouts with DISABLE_PAYOUTS and ENABLE_PAYOUTS=false", () => {
    expect(() => flagsForTest({ disablePayouts: true }).assertPayoutsAllowed()).toThrow(AppError);
    try {
      flagsForTest({ enablePayouts: false }).assertPayoutsAllowed();
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.FEATURE_DISABLED });
    }
  });
});

describe("graceful shutdown", () => {
  it("stops scheduler timers without throwing", () => {
    const scheduler = new JobScheduler(
      flagsForTest({ jobsEnabled: false }),
      { expireCheckouts: async () => undefined } as never,
      { failStale: async () => 0 } as never,
    );
    scheduler.onModuleInit();
    scheduler.stop();
    expect(() => scheduler.stop()).not.toThrow();
  });

  it("does not arm job intervals when this replica is not leader", async () => {
    const scheduler = new JobScheduler(
      flagsForTest({ jobsEnabled: true }),
      { expireCheckouts: async () => undefined } as never,
      { failStale: async () => 0 } as never,
      { hold: async () => false, release: async () => undefined },
    );
    scheduler.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(scheduler.isScheduling()).toBe(false);
    scheduler.stop();
  });

  it("arms job intervals when this replica is leader", async () => {
    const scheduler = new JobScheduler(
      flagsForTest({ jobsEnabled: true }),
      { expireCheckouts: async () => undefined } as never,
      { failStale: async () => 0 } as never,
      { hold: async () => true, release: async () => undefined },
    );
    scheduler.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(scheduler.isScheduling()).toBe(true);
    scheduler.stop();
  });
});
