import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";
import { THEME_PREF_KEY, palette, type ColorSchemeName, type ThemeColors } from "./theme";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ColorSchemeName;
  colors: ThemeColors;
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === "dark" ? "dark" : "light";
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void SecureStore.getItemAsync(THEME_PREF_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreferenceState(stored);
      }
    });
  }, []);

  const resolved: ColorSchemeName = preference === "system" ? system : preference;
  const colors = useMemo(() => palette(resolved), [resolved]);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    void SecureStore.setItemAsync(THEME_PREF_KEY, value);
  };

  const ctx = useMemo(
    () => ({ preference, resolved, colors, setPreference }),
    [preference, resolved, colors],
  );

  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
}

export function useColors(): ThemeColors {
  const ctx = useContext(ThemeContext);
  return ctx?.colors ?? palette(Appearance.getColorScheme() === "dark" ? "dark" : "light");
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemePreference must be used within ThemeProvider");
  }
  return ctx;
}
