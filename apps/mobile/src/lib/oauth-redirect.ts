export const APP_SCHEME = "tcgplatform";
export const AUTH_CALLBACK_PATH = "oauth";

const ALLOWED_AUTH_HOSTS = new Set(["auth.expo.io", "localhost"]);

export function isAllowedAuthRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === `${APP_SCHEME}:`) {
      return parsed.hostname === AUTH_CALLBACK_PATH || parsed.pathname.replace(/^\//, "") === AUTH_CALLBACK_PATH;
    }
    if (parsed.protocol === "https:" && ALLOWED_AUTH_HOSTS.has(parsed.hostname)) return true;
    if (parsed.protocol === "http:" && parsed.hostname === "localhost") return true;
    return false;
  } catch {
    return false;
  }
}
