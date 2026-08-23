/** Keep hex values aligned with packages/ui tokens (UI.1). */

export type ColorSchemeName = "light" | "dark";

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  muted: string;
  border: string;
  fill: string;
  danger: string;
  success: string;
  warning: string;
  inverse: string;
  inverseBg: string;
  primary: string;
  primaryHover: string;
  accent: string;
  amberBg: string;
  amberBorder: string;
};

const brand = {
  primary: "#7C3AED",
  primaryHover: "#8B5CF6",
  accent: "#22D3EE",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

export function palette(scheme: ColorSchemeName): ThemeColors {
  if (scheme === "dark") {
    return {
      bg: "#0B1020",
      surface: "#121A2B",
      surfaceElevated: "#182236",
      text: "#F8FAFC",
      muted: "#94A3B8",
      border: "#263246",
      fill: "#182236",
      danger: brand.danger,
      success: brand.success,
      warning: brand.warning,
      inverse: "#FFFFFF",
      inverseBg: brand.primary,
      primary: brand.primary,
      primaryHover: brand.primaryHover,
      accent: brand.accent,
      amberBg: "#422006",
      amberBorder: "#F59E0B",
    };
  }
  return {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceElevated: "#F1F5F9",
    text: "#0F172A",
    muted: "#64748B",
    border: "#E2E8F0",
    fill: "#F1F5F9",
    danger: brand.danger,
    success: brand.success,
    warning: brand.warning,
    inverse: "#FFFFFF",
    inverseBg: brand.primary,
    primary: brand.primary,
    primaryHover: brand.primaryHover,
    accent: brand.accent,
    amberBg: "#FFFBEB",
    amberBorder: "#FDE68A",
  };
}

/** Default light palette for screens that have not adopted useColors yet. */
export const colors = palette("light");

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export const THEME_PREF_KEY = "tcg.theme";
