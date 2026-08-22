"use client";

import { useEffect, useMemo, useState } from "react";
import { PRICE_CONFIDENCE_LABELS, PRICE_RANGES, formatClp, type PriceRange } from "@tcg/config";
import type { PriceHistoryView } from "@tcg/types";
import { api } from "../lib/api";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="text-sm text-neutral-500">Aún no hay serie histórica suficiente.</p>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const w = 320;
  const h = 88;
  const d = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * w;
      const y = h - ((value - min) / span) * (h - 12) - 6;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full max-w-md text-neutral-800" role="img" aria-label="Historial de precio">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function PriceHistory({ variantId }: { variantId: string }) {
  const [range, setRange] = useState<PriceRange>("3m");
  const [data, setData] = useState<PriceHistoryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api<PriceHistoryView>(`/v1/variants/${variantId}/prices?range=${range}`)
      .then(setData)
      .catch(() => {
        setData(null);
        setError("No se pudo cargar el historial.");
      });
  }, [variantId, range]);

  const series = useMemo(() => {
    if (!data) return [];
    return data.points
      .map((point) => point.sale ?? point.avg ?? point.min)
      .filter((value): value is number => value != null);
  }, [data]);

  return (
    <section className="mt-6">
      <h2 className="text-lg font-medium">Historial de precios</h2>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Rango">
        {PRICE_RANGES.map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded border px-3 py-1 text-sm ${option === range ? "bg-neutral-900 text-white" : ""}`}
            onClick={() => setRange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {data ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <dt className="text-neutral-500">Índice TCG Market Chile</dt>
            <dd>{data.current != null ? formatClp(data.current) : "Sin precio suficiente"}</dd>
            <dt className="text-neutral-500">Última venta</dt>
            <dd>{data.lastSaleClp != null ? formatClp(data.lastSaleClp) : "Sin ventas suficientes"}</dd>
            <dt className="text-neutral-500">Promedio 30 días</dt>
            <dd>{data.avg30dClp != null ? formatClp(data.avg30dClp) : "—"}</dd>
            <dt className="text-neutral-500">Mediana 30 días</dt>
            <dd>{data.median30dClp != null ? formatClp(data.median30dClp) : "—"}</dd>
            <dt className="text-neutral-500">Menor listing</dt>
            <dd>{data.minListingClp != null ? formatClp(data.minListingClp) : "—"}</dd>
            <dt className="text-neutral-500">Confianza</dt>
            <dd>{data.confidence ? PRICE_CONFIDENCE_LABELS[data.confidence] : "Sin ventas suficientes"}</dd>
            <dt className="text-neutral-500">Mínimo</dt>
            <dd>{data.min != null ? formatClp(data.min) : "—"}</dd>
            <dt className="text-neutral-500">Promedio</dt>
            <dd>{data.avg != null ? formatClp(data.avg) : "—"}</dd>
            <dt className="text-neutral-500">Máximo</dt>
            <dd>{data.max != null ? formatClp(data.max) : "—"}</dd>
            <dt className="text-neutral-500">Volumen vendido</dt>
            <dd>{data.volumeSold}</dd>
          </dl>
          <Sparkline values={series} />
          <p className="mt-2 text-xs text-neutral-500">{data.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
