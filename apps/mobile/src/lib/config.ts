import Constants from "expo-constants";

export type AppEnv = "development" | "staging" | "production";

type Extra = {
  apiBaseUrl?: string;
  appEnv?: string;
  enableRealPayments?: boolean;
  analyticsEnabled?: boolean;
  googleClientIdIos?: string;
  googleClientIdAndroid?: string;
  googleClientIdWeb?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

export function getAppEnv(): AppEnv {
  const value = process.env.EXPO_PUBLIC_APP_ENV ?? extra().appEnv ?? "development";
  if (value === "staging" || value === "production") return value;
  return "development";
}

/** Never hardcode a LAN IP. Simulators use localhost; physical devices set EXPO_PUBLIC_API_BASE_URL. */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra().apiBaseUrl;
  return (fromEnv ?? "http://localhost:4000").replace(/\/$/, "");
}

export function clientAllowsRealPayments(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_REAL_PAYMENTS === "true" || extra().enableRealPayments === true;
}

export function analyticsEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ANALYTICS === "true" || extra().analyticsEnabled === true;
}

export function googleClientIds() {
  return {
    ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? extra().googleClientIdIos ?? "",
    android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ?? extra().googleClientIdAndroid ?? "",
    web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ?? extra().googleClientIdWeb ?? "",
  };
}

export const APP_VERSION = Constants.expoConfig?.version ?? "0.1.0";
export { APP_SCHEME, AUTH_CALLBACK_PATH, isAllowedAuthRedirect } from "./oauth-redirect";
