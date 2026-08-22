import { describe, expect, it } from "vitest";
import { assertOauthRuntimeConfig } from "@tcg/config";

describe("assertOauthRuntimeConfig", () => {
  it("fails fast in production if Google is enabled without audiences", () => {
    expect(() =>
      assertOauthRuntimeConfig({
        NODE_ENV: "production",
        ENABLE_GOOGLE_AUTH: "true",
        ENABLE_REAL_PAYMENTS: "false",
      }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("forbids the OAuth stub in production", () => {
    expect(() =>
      assertOauthRuntimeConfig({
        NODE_ENV: "production",
        AUTH_STUB_OAUTH: "true",
        ENABLE_REAL_PAYMENTS: "false",
      }),
    ).toThrow(/AUTH_STUB_OAUTH/);
  });

  it("allows stub + flags in test", () => {
    expect(() =>
      assertOauthRuntimeConfig({
        NODE_ENV: "test",
        ENABLE_GOOGLE_AUTH: "true",
        AUTH_STUB_OAUTH: "true",
      }),
    ).not.toThrow();
  });
});
