import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseStubOauthToken, signStubOauthToken } from "./oauth-stub";

const SECRET = "test-only-jwt-access-secret-not-for-production";

describe("oauth stub tokens", () => {
  it("round-trips a signed stub", () => {
    const token = signStubOauthToken(SECRET, {
      provider: "GOOGLE",
      subject: "sub-1",
      email: "a@b.cl",
      emailVerified: true,
      displayName: "Ana",
    });
    expect(parseStubOauthToken(SECRET, token)).toMatchObject({
      provider: "GOOGLE",
      subject: "sub-1",
      email: "a@b.cl",
      emailVerified: true,
    });
  });

  it("rejects a tampered mac", () => {
    const token = signStubOauthToken(SECRET, {
      provider: "APPLE",
      subject: "sub-2",
      email: null,
      emailVerified: false,
      displayName: null,
    });
    const bad = `${token.slice(0, -2)}aa`;
    expect(() => parseStubOauthToken(SECRET, bad)).toThrow();
  });

  it("rejects a forged payload", () => {
    const payload = Buffer.from(JSON.stringify({ provider: "GOOGLE", subject: "x", email: "x@y.z", emailVerified: true, exp: 9e12 }), "utf8").toString("base64url");
    const mac = createHmac("sha256", "other-secret").update(payload).digest("base64url");
    expect(() => parseStubOauthToken(SECRET, `stub.${payload}.${mac}`)).toThrow();
  });
});
