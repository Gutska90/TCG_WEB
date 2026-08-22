export function shouldNotifyWishlistHit(input: {
  minPriceClp: number;
  targetPriceClp: number;
  listingId: string;
  lastListingId: string | null;
  lastPriceClp: number | null;
}): boolean {
  if (input.minPriceClp > input.targetPriceClp) return false;
  if (input.lastListingId === input.listingId && input.lastPriceClp === input.minPriceClp) return false;
  if (
    input.lastListingId === input.listingId &&
    input.lastPriceClp != null &&
    input.minPriceClp >= input.lastPriceClp
  ) {
    return false;
  }
  return true;
}

export function priceDropBps(currentMin: number, min7d: number): number {
  if (min7d <= 0) return 0;
  return Math.round(((min7d - currentMin) / min7d) * 10_000);
}

export function shouldNotifyPriceDrop(input: {
  currentMin: number;
  min7d: number | null;
  thresholdBps: number;
}): boolean {
  if (input.min7d == null || input.min7d <= 0) return false;
  return priceDropBps(input.currentMin, input.min7d) >= input.thresholdBps;
}
