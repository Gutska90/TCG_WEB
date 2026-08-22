import { createHmac, timingSafeEqual } from "node:crypto";

const PREFIX = "stub.";

export type OauthProfile = {
  provider: "GOOGLE" | "APPLE";
  subject: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
};

export type StubOauthClaims = OauthProfile & { exp: number };

export function signStubOauthToken(
  secret: string,
  input: Omit<StubOauthClaims, "exp"> & { ttlSec?: number },
): string {
  const claims: StubOauthClaims = {
    provider: input.provider,
    subject: input.subject,
    email: input.email,
    emailVerified: input.emailVerified,
    displayName: input.displayName,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSec ?? 600),
  };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const mac = hmac(secret, payload);
  return `${PREFIX}${payload}.${mac}`;
}

export function parseStubOauthToken(secret: string, token: string): OauthProfile {
  if (!token.startsWith(PREFIX)) {
    throw new Error("not_stub");
  }
  const rest = token.slice(PREFIX.length);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) throw new Error("invalid_stub");
  const payload = rest.slice(0, dot);
  const mac = rest.slice(dot + 1);
  const expected = hmac(secret, payload);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("invalid_stub");
  }
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StubOauthClaims;
  if (claims.exp * 1000 <= Date.now()) throw new Error("expired_stub");
  if (claims.provider !== "GOOGLE" && claims.provider !== "APPLE") throw new Error("invalid_stub");
  return {
    provider: claims.provider,
    subject: claims.subject,
    email: claims.email ? claims.email.toLowerCase() : null,
    emailVerified: Boolean(claims.emailVerified),
    displayName: claims.displayName,
  };
}

function hmac(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
