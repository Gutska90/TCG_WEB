const SENSITIVE = /token|password|email|authorization|refresh|secret|cardNumber|purchasePrice/i;

export function sanitizeAnalyticsProps(
  props?: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const next: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (SENSITIVE.test(key)) continue;
    if (typeof value === "string" && SENSITIVE.test(value)) continue;
    next[key] = value;
  }
  return next;
}
