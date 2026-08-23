import type { ApiErrorBody, AuthTokens, MeView } from "@tcg/types";

const ACCESS_KEY = "tcg.accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(ACCESS_KEY, token);
  else sessionStorage.removeItem(ACCESS_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiError(res.status, body.error.code, body.error.message);
  } catch {
    return new ApiError(res.status, "INTERNAL", "Error inesperado");
  }
}

export async function openAuthenticatedFile(path: string): Promise<void> {
  const headers = new Headers();
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  let res = await fetch(path, { headers, credentials: "include" });
  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      const retryHeaders = new Headers();
      const token = getAccessToken();
      if (token) retryHeaders.set("Authorization", `Bearer ${token}`);
      res = await fetch(path, { headers: retryHeaders, credentials: "include" });
    }
  }
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const access = getAccessToken();
  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...init, headers, credentials: "include" });

  if (res.status === 401 && retry && !path.startsWith("/v1/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return api<T>(path, init, false);
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export async function refreshSession(): Promise<boolean> {
  const res = await fetch("/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    setAccessToken(null);
    return false;
  }
  const tokens = (await res.json()) as AuthTokens;
  setAccessToken(tokens.accessToken);
  return true;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(tokens.accessToken);
  await mergeGuestCart();
  return tokens;
}

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
  marketingOptIn?: boolean;
}): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAccessToken(tokens.accessToken);
  await mergeGuestCart();
  return tokens;
}

async function mergeGuestCart(): Promise<void> {
  try {
    await api("/v1/cart");
  } catch {
    // Merge is best-effort; the next cart request retries.
  }
}

export async function logout(): Promise<void> {
  try {
    await api("/v1/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

export function fetchMe(): Promise<MeView> {
  return api<MeView>("/v1/me");
}

export function requestAccountDeletion(): Promise<{ status: "requested"; deletionRequestedAt: string }> {
  return api("/v1/me/deletion-request", { method: "POST" });
}

export async function loginWithGoogle(idToken: string, acceptTerms: boolean, marketingOptIn = false): Promise<AuthTokens> {
  const tokens = await api<AuthTokens>("/v1/auth/oauth/google", {
    method: "POST",
    body: JSON.stringify({ idToken, acceptTerms, marketingOptIn }),
  });
  setAccessToken(tokens.accessToken);
  await mergeGuestCart();
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
  setAccessToken(tokens.accessToken);
  await mergeGuestCart();
  return tokens;
}
