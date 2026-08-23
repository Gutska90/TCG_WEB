"use client";

import { cx } from "@tcg/ui";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "./icon-button";

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Cerrar" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="sheet-title"
        className={cx(
          "relative z-10 w-full max-w-lg rounded-t-[16px] border border-border bg-surface p-4 shadow-[var(--shadow)] sm:rounded-[16px]",
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="sheet-title" className="text-lg font-medium">
            {title}
          </h2>
          <IconButton label="Cerrar" onClick={onClose}>
            ✕
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
