import { PLATFORM, type PriceConfidence } from "@tcg/config";
import { addCalendarDays, calendarDateOnly } from "../common/chile-time";

/** Día calendario Chile (DATE). Nombre histórico; no es medianoche UTC del instante. */
export function utcDateOnly(value: Date = new Date()): Date {
  return calendarDateOnly(value);
}

export function addUtcDays(value: Date, days: number): Date {
  return addCalendarDays(value, days);
}

export function medianInt(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

/** Fuera de 0.5×–2× de la mediana. Si quedan < 3, se usa la serie original. */
export function dropSaleOutliers(values: number[]): number[] {
  const mid = medianInt(values);
  if (mid == null || values.length < 3) return [...values];
  const kept = values.filter((value) => value >= mid * 0.5 && value <= mid * 2);
  return kept.length >= 3 ? kept : [...values];
}

export function saleConfidence(nSales: number): PriceConfidence | null {
  if (nSales >= PLATFORM.priceConfidenceHighSales) return "HIGH";
  if (nSales >= PLATFORM.priceConfidenceMediumSales) return "MEDIUM";
  if (nSales >= 1) return "LOW";
  return null;
}

/**
 * Índice interno: mediana de ventas 30d (outliers fuera) si hay ≥3;
 * si hay 1–2 ventas, esa mediana; si no, LISTING_AVG / live avg.
 * No usa precios de terceros.
 */
export function tcgMarketPrice(input: {
  salePrices30d: number[];
  listingAvgClp: number | null;
}): number | null {
  const cleaned = dropSaleOutliers(input.salePrices30d);
  const sale = medianInt(cleaned);
  if (sale != null) return sale;
  return input.listingAvgClp;
}

export function meanInt(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
