import { formatClp } from "@tcg/config";
import { cx } from "@tcg/ui";

export function Price({
  value,
  prefix,
  size = "md",
  className,
}: {
  value: number | null | undefined;
  prefix?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text = value == null ? "—" : formatClp(value);
  return (
    <p
      className={cx(
        "font-medium tabular-nums text-text",
        size === "lg" && "text-3xl tracking-tight",
        size === "md" && "text-lg",
        size === "sm" && "text-sm",
        className,
      )}
    >
      {prefix ? <span className="mr-1 text-sm font-normal text-text-muted">{prefix}</span> : null}
      {text}
    </p>
  );
}
