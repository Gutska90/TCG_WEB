import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertMobileReleaseEnv,
  isCleartextAllowed,
  normalizeMobileAppEnv,
} from "../../release-config.js";

const here = dirname(fileURLToPath(import.meta.url));

describe("mobile release env", () => {
  it("allows local development over HTTP", () => {
    expect(() =>
      assertMobileReleaseEnv({
        appEnv: "development",
        apiBaseUrl: "http://localhost:4000",
        enableRealPayments: false,
      }),
    ).not.toThrow();
    expect(isCleartextAllowed("development")).toBe(true);
    expect(isCleartextAllowed("staging")).toBe(false);
  });

  it("rejects live payments in every env", () => {
    expect(() =>
      assertMobileReleaseEnv({
        appEnv: "development",
        apiBaseUrl: "http://localhost:4000",
        enableRealPayments: true,
      }),
    ).toThrow(/ENABLE_REAL_PAYMENTS/);
  });

  it("requires public HTTPS on staging and production", () => {
    expect(() =>
      assertMobileReleaseEnv({
        appEnv: "staging",
        apiBaseUrl: "http://10.0.2.2:4000",
        enableRealPayments: false,
      }),
    ).toThrow(/HTTPS/);
    expect(() =>
      assertMobileReleaseEnv({
        appEnv: "production",
        apiBaseUrl: "https://localhost:4000",
        enableRealPayments: false,
      }),
    ).toThrow(/public HTTPS/);
    expect(() =>
      assertMobileReleaseEnv({
        appEnv: "staging",
        apiBaseUrl: "https://api.staging.example",
        enableRealPayments: false,
      }),
    ).not.toThrow();
  });

  it("requires EAS_PROJECT_ID only on EAS cloud builds", () => {
    expect(() =>
      assertMobileReleaseEnv({
        appEnv: "staging",
        apiBaseUrl: "https://api.staging.example",
        enableRealPayments: false,
        easBuild: true,
      }),
    ).toThrow(/EAS_PROJECT_ID/);
    expect(() =>
      assertMobileReleaseEnv({
        appEnv: "staging",
        apiBaseUrl: "https://api.staging.example",
        enableRealPayments: false,
        easBuild: true,
        easProjectId: "11111111-1111-1111-1111-111111111111",
      }),
    ).not.toThrow();
  });

  it("maps unknown app env to development", () => {
    expect(normalizeMobileAppEnv("local")).toBe("development");
  });
});

describe("eas.json B6/B7 contract", () => {
  const eas = JSON.parse(readFileSync(join(here, "../../eas.json"), "utf8")) as {
    build: Record<
      string,
      { distribution?: string; android?: { buildType?: string }; env?: Record<string, string> }
    >;
    submit?: Record<string, unknown>;
  };

  it("keeps preview as internal APK (no Play submit)", () => {
    expect(eas.build.preview?.distribution).toBe("internal");
    expect(eas.build.preview?.android?.buildType).toBe("apk");
    expect(eas.submit && "android" in eas.submit).toBe(false);
    expect(eas.submit && "production" in eas.submit).toBe(false);
  });

  it("keeps TestFlight as store-distribution iOS without Android submit", () => {
    expect(eas.build.testflight?.distribution).toBe("store");
    expect(eas.submit?.testflight).toBeTruthy();
  });

  it("pins sandbox payments on every build profile", () => {
    for (const [name, profile] of Object.entries(eas.build)) {
      expect(profile.env?.EXPO_PUBLIC_ENABLE_REAL_PAYMENTS, name).toBe("false");
    }
  });
});
