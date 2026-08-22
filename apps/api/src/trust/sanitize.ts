export function sanitizePlainText(input: string, max: number): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function asJsonRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
