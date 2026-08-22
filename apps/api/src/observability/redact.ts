const SECRET_KEY = /password|token|secret|authorization|cookie|hash|jwt|payload/i;
const SECRET_VALUES = /bearer\s+[a-z0-9._-]+/gi;

export function redactValue(key: string, value: unknown): unknown {
  if (SECRET_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") {
    return value.replace(SECRET_VALUES, "Bearer [REDACTED]");
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return redactRecord(value as Record<string, unknown>);
  }
  return value;
}

export function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}
