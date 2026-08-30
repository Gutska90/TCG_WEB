/** Design tokens UI.1 — shared by web CSS and mobile palettes. */

export const lightColors = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceElevated: "#F1F5F9",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
} as const;

export const darkColors = {
  background: "#0B1020",
  surface: "#121A2B",
  surfaceElevated: "#182236",
  border: "#263246",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
} as const;

export const brandColors = {
  primary: "#7C3AED",
  primaryHover: "#8B5CF6",
  accent: "#22D3EE",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

export const gameAccents = {
  pokemon: "#EAB308",
  magic: "#F97316",
  "one-piece": "#EF4444",
  yugioh: "#8B5CF6",
  "mitos-y-leyendas": "#B45309",
} as const;

export const radii = {
  card: 16,
  control: 12,
} as const;

export const motion = {
  durationMs: 160,
} as const;

export const THEME_STORAGE_KEY = "tcg.theme";

export type ThemePreference = "light" | "dark" | "system";

export function gameAccentForSlug(slug: string): string | undefined {
  const key = slug.toLowerCase();
  if (key.includes("pokemon") || key.includes("pokémon")) return gameAccents.pokemon;
  if (key.includes("magic") || key === "mtg") return gameAccents.magic;
  if (key.includes("one-piece") || key.includes("onepiece")) return gameAccents["one-piece"];
  if (key.includes("yugioh") || key.includes("yu-gi-oh") || key.includes("ygo")) return gameAccents.yugioh;
  if (key.includes("mitos") || key === "myl") return gameAccents["mitos-y-leyendas"];
  return undefined;
}

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export function statusTone(status: string): StatusTone {
  const value = status.toUpperCase();
  if (value === "ACTIVE" || value === "COMPLETED" || value === "PAID" || value === "APPROVED") return "success";
  if (value === "PAUSED" || value === "CANCELLED" || value === "CANCELED" || value === "EXPIRED") return "neutral";
  if (value === "PENDING" || value === "PROCESSING" || value === "HELD") return "warning";
  if (value === "FAILED" || value === "DISPUTED" || value === "REJECTED") return "danger";
  return "neutral";
}
