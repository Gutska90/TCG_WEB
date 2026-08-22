export function track(event: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  const safe = { ...props };
  delete safe.purchasePrice;
  delete safe.purchasePriceClp;
  console.info("[analytics]", event, safe);
}
