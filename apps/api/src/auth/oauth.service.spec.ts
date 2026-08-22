import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { OauthService } from "./oauth.service";
import { signStubOauthToken } from "./oauth-stub";
import { TEST_JWT_ACCESS_SECRET } from "./jwt-secret";

describe("OauthService", () => {
  const config = { get: vi.fn().mockReturnValue(TEST_JWT_ACCESS_SECRET) };
  const service = new OauthService(config as never);

  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env.ENABLE_GOOGLE_AUTH = "true";
    process.env.ENABLE_APPLE_AUTH = "true";
    process.env.AUTH_STUB_OAUTH = "true";
    process.env.NODE_ENV = "test";
    process.env.GOOGLE_CLIENT_ID = "test-google-client.apps.googleusercontent.com";
    process.env.APPLE_CLIENT_ID = "cl.tcgplatform.app";
  });

  it("accepts a valid Google stub token", async () => {
    const idToken = signStubOauthToken(TEST_JWT_ACCESS_SECRET, {
      provider: "GOOGLE",
      subject: "g-1",
      email: "user@gmail.com",
      emailVerified: true,
      displayName: "User",
    });
    await expect(service.verifyGoogle(idToken)).resolves.toMatchObject({
      provider: "GOOGLE",
      subject: "g-1",
      emailVerified: true,
    });
  });

  it("rejects an invalid Google stub token", async () => {
    await expect(service.verifyGoogle("stub.not-valid.token")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it("accepts a valid Apple stub token", async () => {
    const identityToken = signStubOauthToken(TEST_JWT_ACCESS_SECRET, {
      provider: "APPLE",
      subject: "apple.sub",
      email: "relay@privaterelay.appleid.com",
      emailVerified: true,
      displayName: null,
    });
    await expect(service.verifyApple(identityToken)).resolves.toMatchObject({
      provider: "APPLE",
      subject: "apple.sub",
    });
  });

  it("rejects an invalid Apple stub token", async () => {
    await expect(service.verifyApple("eyJhbGciOiJub25lIn0.e30.")).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it("rejects Google when the flag is off", async () => {
    process.env.ENABLE_GOOGLE_AUTH = "false";
    await expect(service.verifyGoogle("stub.x")).rejects.toMatchObject({
      code: ERROR_CODES.FEATURE_DISABLED,
    });
  });
});
