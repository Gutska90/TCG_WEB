"use client";

import { useEffect, useMemo, useState } from "react";
import { PRICE_CONFIDENCE_LABELS, PRICE_RANGES, formatClp, type PriceRange } from "@tcg/config";
import type { PriceHistoryView } from "@tcg/types";
import { api } from "../lib/api";
import { Badge } from "./ui/badge";
import { PricesSkeleton } from "./ui/skeleton";
import { buttonClassName } from "./ui/button-styles";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="text-sm text-text-muted">Aún no hay serie histórica suficiente.</p>;
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
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full max-w-md text-primary" role="img" aria-label="Historial de precio">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function confidenceTone(value: PriceHistoryView["confidence"]): "success" | "warning" | "danger" | "neutral" {
  if (value === "HIGH") return "success";
  if (value === "MEDIUM") return "warning";
  if (value === "LOW") return "danger";
  return "neutral";
}

export function PriceHistory({ variantId }: { variantId: string }) {
  const [range, setRange] = useState<PriceRange>("3m");
  const [data, setData] = useState<PriceHistoryView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setError(null);
    setLoading(true);
    api<PriceHistoryView>(`/v1/variants/${variantId}/prices?range=${range}`)
      .then(setData)
      .catch(() => {
        setData(null);
        setError("No se pudo cargar el historial.");
      })
      .finally(() => setLoading(false));
  }, [variantId, range]);

  const series = useMemo(() => {
    if (!data) return [];
    return data.points
      .map((point) => point.sale ?? point.avg ?? point.min)
      .filter((value): value is number => value != null);
  }, [data]);

  return (
    <section className="mt-6">
      <h2 className="text-xl font-medium tracking-tight">Historial de precios</h2>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Rango">
        {PRICE_RANGES.map((option) => (
          <button
            key={option}
            type="button"
            className={buttonClassName(option === range ? "primary" : "secondary", "min-h-9 px-3 py-1")}
            onClick={() => setRange(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {loading ? <div className="mt-4"><PricesSkeleton /></div> : null}
      {data ? (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[16px] border border-border bg-surface p-3">
              <dt className="text-xs text-text-muted">Última venta</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {data.lastSaleClp != null ? formatClp(data.lastSaleClp) : "Sin ventas suficientes"}
              </dd>
            </div>
            <div className="rounded-[16px] border border-border bg-surface p-3">
              <dt className="text-xs text-text-muted">Mediana 30 días</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {data.median30dClp != null ? formatClp(data.median30dClp) : "—"}
              </dd>
            </div>
            <div className="rounded-[16px] border border-border bg-surface p-3">
              <dt className="text-xs text-text-muted">Menor listing</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {data.minListingClp != null ? formatClp(data.minListingClp) : "—"}
              </dd>
            </div>
            <div className="rounded-[16px] border border-border bg-surface p-3">
              <dt className="text-xs text-text-muted">Confianza</dt>
              <dd className="mt-1">
                <Badge tone={confidenceTone(data.confidence)}>
                  {data.confidence ? PRICE_CONFIDENCE_LABELS[data.confidence] : "Sin ventas suficientes"}
                </Badge>
              </dd>
            </div>
          </dl>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <dt className="text-text-muted">Índice TCG Market Chile</dt>
            <dd>{data.current != null ? formatClp(data.current) : "Sin precio suficiente"}</dd>
            <dt className="text-text-muted">Promedio 30 días</dt>
            <dd>{data.avg30dClp != null ? formatClp(data.avg30dClp) : "—"}</dd>
            <dt className="text-text-muted">Mínimo</dt>
            <dd>{data.min != null ? formatClp(data.min) : "—"}</dd>
            <dt className="text-text-muted">Promedio</dt>
            <dd>{data.avg != null ? formatClp(data.avg) : "—"}</dd>
            <dt className="text-text-muted">Máximo</dt>
            <dd>{data.max != null ? formatClp(data.max) : "—"}</dd>
            <dt className="text-text-muted">Volumen vendido</dt>
            <dd>{data.volumeSold}</dd>
          </dl>
          <Sparkline values={series} />
          <p className="mt-2 text-xs text-text-muted">{data.disclaimer}</p>
        </>
      ) : null}
    </section>
  );
}
