export const COLLECTION_VALUE_DISCLAIMER =
  "Valor estimado basado en publicaciones activas, no necesariamente precio de venta.";

export const COLLECTION_PL_DISCLAIMER = "Estimación, no rentabilidad realizada.";

export function medianInt(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

/** Mediana de precios comparable; si no hay, mínima; si tampoco, null. */
export function estimateUnitClp(comparable: number[], fallback: number[]): number | null {
  return medianInt(comparable) ?? medianInt(fallback);
}

export function lotRegisteredCostClp(quantity: number, purchasePriceClp: number | null): number | null {
  if (purchasePriceClp == null) return null;
  return quantity * purchasePriceClp;
}

export function lotEstimatedValueClp(quantity: number, unitClp: number | null): number | null {
  if (unitClp == null) return null;
  return quantity * unitClp;
}

export function lotEstimatedPlClp(
  quantity: number,
  unitClp: number | null,
  purchasePriceClp: number | null,
): number | null {
  if (unitClp == null || purchasePriceClp == null) return null;
  return (unitClp - purchasePriceClp) * quantity;
}

export function duplicateStats(quantitiesByKey: Iterable<number>): {
  duplicateCards: number;
  extraCopies: number;
} {
  let duplicateCards = 0;
  let extraCopies = 0;
  for (const quantity of quantitiesByKey) {
    if (quantity > 1) {
      duplicateCards += 1;
      extraCopies += quantity - 1;
    }
  }
  return { duplicateCards, extraCopies };
}

export function setProgressPercent(ownedUnique: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((ownedUnique / total) * 1000) / 10;
}

export type LotValuationInput = {
  quantity: number;
  purchasePriceClp: number | null;
  estimatedUnitClp: number | null;
};

export function summarizeLots(lots: LotValuationInput[]): {
  totalCards: number;
  estimatedValueClp: number | null;
  itemsWithoutEstimate: number;
  registeredCostClp: number | null;
  itemsWithoutCost: number;
  estimatedPlClp: number | null;
  itemsInPl: number;
} {
  let totalCards = 0;
  let estimatedValueClp = 0;
  let hasEstimate = false;
  let itemsWithoutEstimate = 0;
  let registeredCostClp = 0;
  let hasCost = false;
  let itemsWithoutCost = 0;
  let estimatedPlClp = 0;
  let itemsInPl = 0;

  for (const lot of lots) {
    totalCards += lot.quantity;
    const value = lotEstimatedValueClp(lot.quantity, lot.estimatedUnitClp);
    if (value == null) {
      itemsWithoutEstimate += lot.quantity;
    } else {
      estimatedValueClp += value;
      hasEstimate = true;
    }
    const cost = lotRegisteredCostClp(lot.quantity, lot.purchasePriceClp);
    if (cost == null) {
      itemsWithoutCost += lot.quantity;
    } else {
      registeredCostClp += cost;
      hasCost = true;
    }
    const pl = lotEstimatedPlClp(lot.quantity, lot.estimatedUnitClp, lot.purchasePriceClp);
    if (pl != null) {
      estimatedPlClp += pl;
      itemsInPl += lot.quantity;
    }
  }

  return {
    totalCards,
    estimatedValueClp: hasEstimate ? estimatedValueClp : null,
    itemsWithoutEstimate,
    registeredCostClp: hasCost ? registeredCostClp : null,
    itemsWithoutCost,
    estimatedPlClp: itemsInPl > 0 ? estimatedPlClp : null,
    itemsInPl,
  };
}
