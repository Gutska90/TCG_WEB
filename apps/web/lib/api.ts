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
