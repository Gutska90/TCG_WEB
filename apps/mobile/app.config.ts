import type { ExpoConfig } from "expo/config";
import {
  assertMobileReleaseEnv,
  isCleartextAllowed,
  normalizeMobileAppEnv,
} from "./release-config.js";

const appEnv = normalizeMobileAppEnv(process.env.EXPO_PUBLIC_APP_ENV);
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const enableRealPayments = process.env.EXPO_PUBLIC_ENABLE_REAL_PAYMENTS === "true";
const easProjectId = process.env.EAS_PROJECT_ID;
const associatedDomain = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN?.trim();

assertMobileReleaseEnv({
  appEnv,
  apiBaseUrl,
  enableRealPayments,
  easProjectId,
  easBuild: process.env.EAS_BUILD === "true",
});

const config: ExpoConfig = {
  name: "TCG Market",
  slug: "tcg-platform",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  scheme: "tcgplatform",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#171717",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "cl.tcgplatform.app",
    buildNumber: "1",
    usesAppleSignIn: true,
    infoPlist: {
      CFBundleDisplayName: "TCG Market",
    },
    ...(associatedDomain
      ? { associatedDomains: [`applinks:${associatedDomain}`] }
      : {}),
  },
  android: {
    package: "cl.tcgplatform.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#171717",
    },
    allowBackup: false,
    softwareKeyboardLayoutMode: "resize",
    permissions: ["INTERNET"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: false,
        data: [{ scheme: "tcgplatform" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    "expo-apple-authentication",
    [
      "expo-image-picker",
      {
        photosPermission: "Usamos tus fotos para publicaciones y evidencia de reclamos.",
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    apiBaseUrl,
    appEnv,
    enableRealPayments,
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS === "true",
    googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    usesCleartextTraffic: isCleartextAllowed(appEnv),
    eas: {
      projectId: easProjectId,
    },
  },
};

export default config;
