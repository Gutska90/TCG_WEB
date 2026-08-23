"use client";

import { useTheme } from "./theme-provider";

const OPTIONS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Tema">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setPreference(option.value)}
          aria-label={option.label}
          aria-pressed={preference === option.value}
          className={
            preference === option.value
              ? "min-h-11 rounded-[12px] bg-surface-elevated px-2.5 text-xs font-medium text-text"
              : "min-h-11 rounded-[12px] px-2.5 text-xs font-medium text-text-muted hover:bg-surface-elevated hover:text-text"
          }
        >
          {compact ? (
            <>
              <span className="lg:hidden">{option.label.slice(0, 1)}</span>
              <span className="hidden lg:inline">{option.label}</span>
            </>
          ) : (
            option.label
          )}
        </button>
      ))}
    </div>
  );
}
