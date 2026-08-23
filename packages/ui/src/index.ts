export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export {
  THEME_STORAGE_KEY,
  brandColors,
  darkColors,
  gameAccentForSlug,
  gameAccents,
  lightColors,
  motion,
  radii,
  statusTone,
} from "./tokens";
export type { StatusTone, ThemePreference } from "./tokens";
