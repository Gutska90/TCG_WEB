import { cx } from "@tcg/ui";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className,
  hover = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; hover?: boolean }) {
  return (
    <div
      className={cx(
        "rounded-[16px] border border-border bg-surface p-4 shadow-[var(--shadow)]",
        hover && "elevate-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
