"use client";

import { Moon, Sun } from "lucide-react";
import { cx, type ThemePreference } from "@tcg/ui";
import { useTheme } from "./theme-provider";

const NEXT = {
  light: "dark",
  dark: "system",
  system: "light",
} as const;

const NEXT_LABEL = {
  light: "oscuro",
  dark: "automático",
  system: "claro",
} as const;

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Auto" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();

  if (!compact) {
    return (
      <div className="flex rounded-[12px] border border-border p-1" role="group" aria-label="Tema">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreference(option.value)}
            aria-pressed={preference === option.value}
            className={cx(
              "min-h-9 flex-1 rounded-[10px] px-2 text-xs",
              preference === option.value ? "bg-surface-elevated font-medium text-text" : "text-text-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  const next = NEXT[preference];
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Tema ${preference === "system" ? "automático" : preference === "dark" ? "oscuro" : "claro"}. Cambiar a ${NEXT_LABEL[preference]}`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[12px] text-text hover:bg-surface-elevated"
    >
      <Sun className="h-5 w-5 dark:hidden" aria-hidden />
      <Moon className="hidden h-5 w-5 dark:block" aria-hidden />
    </button>
  );
}
