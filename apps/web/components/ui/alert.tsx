import { cx } from "@tcg/ui";
import type { ReactNode } from "react";

export function Alert({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cx(
        "rounded-[12px] border px-3 py-2 text-sm",
        tone === "neutral" && "border-border bg-surface-elevated text-text",
        tone === "warning" && "border-warning/40 bg-warning/10 text-text",
        tone === "danger" && "border-danger/40 bg-danger/10 text-danger",
        tone === "success" && "border-success/40 bg-success/10 text-text",
        className,
      )}
    >
      {children}
    </div>
  );
}
