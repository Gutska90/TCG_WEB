import { cx } from "@tcg/ui";
import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { controlClassName } from "./input";

export function SearchInput({
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return (
    <div className="relative w-full min-w-0">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
      />
      <input
        id={id}
        type="search"
        className={cx(controlClassName, "min-h-11 pl-10", className)}
        {...props}
      />
    </div>
  );
}
