"use client";

import type { ReactNode } from "react";
import { QuantityStepper } from "./quantity-stepper";

export function QtyOnImage({
  available,
  value,
  onChange,
  disabled,
  children,
}: {
  available: number;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {available > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center">
          <div className="pointer-events-auto">
            <QuantityStepper
              appearance="onImage"
              value={value}
              min={1}
              max={available}
              onChange={onChange}
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
