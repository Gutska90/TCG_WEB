import { carrierTrackingUrl } from "@tcg/config";
import type { ShipmentStatus, ShippingMethod } from "@tcg/config";
import type { ShipmentView } from "@tcg/types";

export type ShipmentRow = {
  id: string;
  orderId: string;
  method: ShippingMethod;
  status: ShipmentStatus;
  carrier: string | null;
  trackingCode: string | null;
  meetupAt: Date | null;
  meetupPlace: string | null;
  labelUrl: string | null;
};

export function toShipmentView(row: ShipmentRow): ShipmentView {
  return {
    id: row.id,
    orderId: row.orderId,
    method: row.method,
    status: row.status,
    carrier: row.carrier,
    trackingCode: row.trackingCode,
    trackingUrl: carrierTrackingUrl(row.carrier, row.trackingCode),
    meetupAt: row.meetupAt?.toISOString() ?? null,
    meetupPlace: row.meetupPlace,
    labelUrl: row.labelUrl,
  };
}
