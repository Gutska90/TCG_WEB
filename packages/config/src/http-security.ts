/** B2: headers, open-redirect, IP allowlist. Sin secretos. */

export function safeInternalPath(next: string | null | undefined): string | null {
  if (!next || next.length > 512) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.includes("\\") || next.includes("://")) return null;
  if (hasAsciiControlChars(next)) return null;
  const decoded = decodeUriSafe(next);
  if (!decoded) return null;
  if (decoded.startsWith("//") || decoded.includes("://") || decoded.includes("\\")) return null;
  return next;
}

function hasAsciiControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 32) return true;
  }
  return false;
}

function decodeUriSafe(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseIpAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((row) => row.trim())
    .filter(Boolean);
}

export function clientIpFromForwarded(xff: string | null | undefined, fallback = ""): string {
  const first = xff?.split(",")[0]?.trim();
  return first || fallback;
}

export function ipAllowlistAllows(clientIp: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  return allowlist.includes(clientIp);
}

export type NextSecurityHeaderOptions = {
  isDev: boolean;
  enableHsts: boolean;
  googleGsi?: boolean;
};

export function buildContentSecurityPolicy(options: {
  isDev: boolean;
  upgradeInsecureRequests: boolean;
  scriptSrc?: string[];
  connectSrc?: string[];
  frameSrc?: string[];
  styleSrc?: string[];
}): string {
  const script = [
    "'self'",
    "'unsafe-inline'",
    "blob:",
    ...(options.isDev ? ["'unsafe-eval'"] : []),
    ...(options.scriptSrc ?? []),
  ];
  const connect = ["'self'", ...(options.isDev ? ["ws:", "wss:"] : []), ...(options.connectSrc ?? [])];
  const frame = options.frameSrc?.length ? options.frameSrc : ["'none'"];
  const style = ["'self'", "'unsafe-inline'", ...(options.styleSrc ?? [])];
  const parts = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `style-src ${uniq(style).join(" ")}`,
    `script-src ${uniq(script).join(" ")}`,
    `connect-src ${uniq(connect).join(" ")}`,
    `frame-src ${uniq(frame).join(" ")}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
  ];
  if (options.upgradeInsecureRequests) parts.push("upgrade-insecure-requests");
  return parts.join("; ");
}

export function nextDocumentHeaders(options: NextSecurityHeaderOptions): Array<{ key: string; value: string }> {
  const google = options.googleGsi
    ? {
        scriptSrc: ["https://accounts.google.com"],
        connectSrc: ["https://accounts.google.com"],
        frameSrc: ["https://accounts.google.com"],
        styleSrc: ["https://accounts.google.com"],
      }
    : {};
  const headers: Array<{ key: string; value: string }> = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy({
        isDev: options.isDev,
        upgradeInsecureRequests: options.enableHsts,
        ...google,
      }),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
    {
      key: "Cross-Origin-Opener-Policy",
      value: options.googleGsi ? "same-origin-allow-popups" : "same-origin",
    },
  ];
  if (options.enableHsts) {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  }
  return headers;
}

export function enableHstsFromEnv(env: NodeJS.Dict<string> = process.env): boolean {
  const nodeEnv = env.NODE_ENV ?? "development";
  const appEnv = env.APP_ENV ?? "";
  return nodeEnv === "production" || nodeEnv === "staging" || appEnv === "staging" || appEnv === "production";
}

export function apiHelmetOptions(strictTls: boolean): {
  contentSecurityPolicy: {
    useDefaults: false;
    directives: { defaultSrc: string[]; frameAncestors: string[]; baseUri: string[]; formAction: string[] };
  };
  crossOriginResourcePolicy: { policy: "cross-origin" };
  referrerPolicy: { policy: "no-referrer" };
  hsts: false | { maxAge: number; includeSubDomains: true };
  xFrameOptions: { action: "deny" };
} {
  return {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
    hsts: strictTls ? { maxAge: 63072000, includeSubDomains: true } : false,
    xFrameOptions: { action: "deny" },
  };
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}
