import type { AuthTokens } from "@tcg/types";
import { api, persistTokens } from "./api";

export async function loginWithGoogleIdToken(
  idToken: string,
  acceptTerms: boolean,
): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>("/v1/auth/oauth/google", {
    method: "POST",
    body: JSON.stringify({ idToken, acceptTerms }),
  });
  await persistTokens(tokens);
  return tokens;
}

export async function loginWithAppleIdentityToken(
  identityToken: string,
  acceptTerms: boolean,
  extra?: { email?: string; displayName?: string },
): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>("/v1/auth/oauth/apple", {
    method: "POST",
    body: JSON.stringify({
      identityToken,
      acceptTerms,
      email: extra?.email,
      displayName: extra?.displayName,
    }),
  });
  await persistTokens(tokens);
  return tokens;
}

export async function loginWithTestOauth(input: {
  provider: "GOOGLE" | "APPLE";
  subject: string;
  email?: string;
  acceptTerms: boolean;
}): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>("/v1/auth/oauth/test", {
    method: "POST",
    body: JSON.stringify({ ...input, emailVerified: true }),
  });
  await persistTokens(tokens);
  return tokens;
}
