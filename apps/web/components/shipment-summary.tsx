import { SHIPMENT_STATUS_LABELS, SHIPPING_METHOD_LABELS } from "@tcg/config";
import type { OrderView } from "@tcg/types";

export function ShipmentSummary({ order }: { order: OrderView }) {
  const shipment = order.shipment;
  return (
    <div className="mt-4 rounded border p-3 text-sm">
      <p>
        Entrega: {SHIPPING_METHOD_LABELS[order.shippingMethod]}
        {shipment ? ` · ${SHIPMENT_STATUS_LABELS[shipment.status]}` : ""}
      </p>
      {order.shippingClp > 0 ? <p className="text-neutral-600">Costo de envío incluido en el total.</p> : null}
      {shipment?.trackingCode ? (
        <p className="mt-1">
          Tracking {shipment.trackingCode}
          {shipment.trackingUrl ? (
            <>
              {" "}
              ·{" "}
              <a href={shipment.trackingUrl} className="underline" target="_blank" rel="noreferrer">
                Seguir envío
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {shipment?.meetupPlace ? (
        <p className="mt-1">
          Encuentro: {shipment.meetupPlace}
          {shipment.meetupAt ? ` · ${new Date(shipment.meetupAt).toLocaleString("es-CL")}` : ""}
        </p>
      ) : null}
    </div>
  );
}
