import { cx } from "@tcg/ui";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] px-4 py-2 text-sm font-medium transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" && "bg-primary text-white hover:bg-primary-hover",
    variant === "secondary" && "border border-border bg-surface text-text hover:bg-surface-elevated",
    variant === "ghost" && "bg-transparent text-text hover:bg-surface-elevated",
    variant === "danger" && "bg-danger text-white hover:opacity-90",
    className,
  );
}
