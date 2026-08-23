"use client";

import { cx } from "@tcg/ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-[12px] text-text transition duration-150 hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
