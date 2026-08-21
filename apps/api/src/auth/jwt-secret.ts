const PLACEHOLDER_MARKERS = ["change-me", "changeme", "dev-only", "replace-me", "test-only"];

export const TEST_JWT_ACCESS_SECRET = "test-only-jwt-access-secret-not-for-production";

export function resolveJwtAccessSecret(
  raw: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const value = raw?.trim() ?? "";
  if (nodeEnv === "test") {
    if (value.length >= 32 && !isPlaceholder(value)) return value;
    return TEST_JWT_ACCESS_SECRET;
  }
  if (value.length < 32 || isPlaceholder(value)) {
    throw new Error(
      "JWT_ACCESS_SECRET is required (min 32 characters, no placeholder such as change-me or dev-only-change-me)",
    );
  }
  return value;
}

export function isPlaceholderSecret(value: string): boolean {
  return isPlaceholder(value);
}

function isPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return true;
  return PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}
