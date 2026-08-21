import type { ShippingZone } from "./chile";

type QuoteMethod = "CHILEXPRESS" | "BLUE_EXPRESS" | "MEETUP" | "COORDINATED" | "STORE_PICKUP";

export type ShippingRateSeed = {
  originZone: ShippingZone;
  destZone: ShippingZone;
  method: Extract<QuoteMethod, "CHILEXPRESS" | "BLUE_EXPRESS" | "COORDINATED">;
  priceClp: number;
};

const ZONES: readonly ShippingZone[] = ["RM", "REGIONS"];

/** Tabla MVP RM vs regiones. Admin podrá editar filas equivalentes en `shipping_rates`. */
export const SHIPPING_RATE_SEED: readonly ShippingRateSeed[] = [
  { originZone: "RM", destZone: "RM", method: "CHILEXPRESS", priceClp: 3990 },
  { originZone: "RM", destZone: "REGIONS", method: "CHILEXPRESS", priceClp: 5990 },
  { originZone: "REGIONS", destZone: "RM", method: "CHILEXPRESS", priceClp: 5990 },
  { originZone: "REGIONS", destZone: "REGIONS", method: "CHILEXPRESS", priceClp: 5490 },
  { originZone: "RM", destZone: "RM", method: "BLUE_EXPRESS", priceClp: 3790 },
  { originZone: "RM", destZone: "REGIONS", method: "BLUE_EXPRESS", priceClp: 5490 },
  { originZone: "REGIONS", destZone: "RM", method: "BLUE_EXPRESS", priceClp: 5490 },
  { originZone: "REGIONS", destZone: "REGIONS", method: "BLUE_EXPRESS", priceClp: 4990 },
  ...ZONES.flatMap((originZone) =>
    ZONES.map(
      (destZone): ShippingRateSeed => ({
        originZone,
        destZone,
        method: "COORDINATED",
        priceClp: 0,
      }),
    ),
  ),
];

export function carrierForMethod(method: QuoteMethod): string | null {
  if (method === "CHILEXPRESS" || method === "BLUE_EXPRESS") {
    return method;
  }
  return null;
}

export function carrierTrackingUrl(carrier: string | null, trackingCode: string | null): string | null {
  if (!carrier || !trackingCode) {
    return null;
  }
  const code = encodeURIComponent(trackingCode);
  if (carrier === "CHILEXPRESS") {
    return `https://www.chilexpress.cl/herramientas/seguimiento?nro=${code}`;
  }
  if (carrier === "BLUE_EXPRESS") {
    return `https://www.blue.cl/seguimiento?codigo=${code}`;
  }
  return null;
}

export function lookupShippingRate(
  rates: ReadonlyArray<{ originZone: string; destZone: string; method: string; priceClp: number }>,
  originZone: ShippingZone,
  destZone: ShippingZone,
  method: QuoteMethod,
): number | null {
  const row = rates.find(
    (rate) => rate.originZone === originZone && rate.destZone === destZone && rate.method === method,
  );
  return row ? row.priceClp : null;
}

/** Cotización pura contra la tabla semilla. `null` = método no ofrecido. */
export function quoteShippingClp(
  method: QuoteMethod,
  originZone: ShippingZone,
  destZone: ShippingZone,
): number | null {
  if (method === "MEETUP") {
    return 0;
  }
  if (method === "STORE_PICKUP") {
    return null;
  }
  return lookupShippingRate(SHIPPING_RATE_SEED, originZone, destZone, method);
}
