import type { ExpoConfig } from "expo/config";

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

const config: ExpoConfig = {
  name: "TCG Platform",
  slug: "tcg-platform",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
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
      CFBundleDisplayName: "TCG Platform",
    },
  },
  android: {
    package: "cl.tcgplatform.app",
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#171717",
    },
  },
  plugins: ["expo-router", "expo-secure-store", "expo-web-browser", "expo-apple-authentication"],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    apiBaseUrl,
    appEnv,
    enableRealPayments: process.env.EXPO_PUBLIC_ENABLE_REAL_PAYMENTS === "true",
    analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS === "true",
    googleClientIdIos: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    googleClientIdAndroid: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    googleClientIdWeb: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    usesCleartextTraffic: appEnv !== "production",
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
