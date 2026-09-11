"use client";

import type { MouseEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cx } from "@tcg/ui";

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  appearance = "surface",
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  appearance?: "surface" | "onImage";
}) {
  const qty = Math.min(Math.max(min, value), Math.max(min, max));
  const canMinus = !disabled && qty > min;
  const canPlus = !disabled && qty < max;

  function guard(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      className={cx(
        "inline-flex items-center gap-1 rounded-full p-1",
        appearance === "onImage"
          ? "bg-black/80 text-white shadow-md ring-1 ring-white/25"
          : "border border-border bg-surface text-text",
      )}
      onClick={guard}
      onPointerDown={guard}
    >
      <button
        type="button"
        className={cx(
          "inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40",
          appearance === "onImage" ? "hover:bg-white/15" : "hover:bg-surface-elevated",
        )}
        aria-label="Menos"
        disabled={!canMinus}
        onClick={(event) => {
          guard(event);
          if (canMinus) onChange(qty - 1);
        }}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-8 px-1 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        className={cx(
          "inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40",
          appearance === "onImage" ? "hover:bg-white/15" : "hover:bg-surface-elevated",
        )}
        aria-label="Más"
        disabled={!canPlus}
        onClick={(event) => {
          guard(event);
          if (canPlus) onChange(qty + 1);
        }}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
