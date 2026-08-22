import type { ApiErrorBody, AuthTokens } from "@tcg/types";
import { getApiBaseUrl } from "./config";
import { ApiError } from "./errors";
import { clearSessionTokens, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from "./session";

let lastRequestId: string | null = null;

export function getLastRequestId(): string | null {
  return lastRequestId;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiError(res.status, body.error.code, body.error.message);
  } catch {
    return new ApiError(res.status, "INTERNAL", "Error inesperado");
  }
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    setAccessToken(null);
    return false;
  }
  const res = await fetch(`${getApiBaseUrl()}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearSessionTokens();
    return false;
  }
  const tokens = (await res.json()) as AuthTokens;
  setAccessToken(tokens.accessToken);
  await setRefreshToken(tokens.refreshToken);
  return true;
}

export async function persistTokens(tokens: AuthTokens): Promise<void> {
  setAccessToken(tokens.accessToken);
  await setRefreshToken(tokens.refreshToken);
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  const access = getAccessToken();
  if (access) headers.set("Authorization", `Bearer ${access}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  } catch (err) {
    throw err instanceof TypeError ? err : new TypeError("network");
  }
  lastRequestId = res.headers.get("x-request-id");

  if (res.status === 401 && retry && !path.startsWith("/v1/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) return api<T>(path, init, false);
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { refreshSession };
