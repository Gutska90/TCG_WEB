"use strict";

/** @typedef {"development" | "staging" | "production"} MobileAppEnv */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * @param {string | undefined} value
 * @returns {MobileAppEnv}
 */
function normalizeMobileAppEnv(value) {
  if (value === "staging" || value === "production") return value;
  return "development";
}

/**
 * @param {MobileAppEnv} appEnv
 */
function isCleartextAllowed(appEnv) {
  return appEnv === "development";
}

/**
 * @param {string} url
 * @returns {string | null}
 */
function hostnameOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   appEnv: string;
 *   apiBaseUrl: string;
 *   enableRealPayments: boolean;
 *   easProjectId?: string;
 *   easBuild?: boolean;
 * }} input
 */
function assertMobileReleaseEnv(input) {
  if (input.enableRealPayments) {
    throw new Error(
      "EXPO_PUBLIC_ENABLE_REAL_PAYMENTS must stay false for this beta (no live payments).",
    );
  }

  const appEnv = normalizeMobileAppEnv(input.appEnv);
  if (appEnv === "development") return;

  const url = input.apiBaseUrl.trim();
  if (!url.startsWith("https://")) {
    throw new Error(
      `EXPO_PUBLIC_API_BASE_URL must be HTTPS for ${appEnv} (got ${url || "(empty)"}).`,
    );
  }

  const host = hostnameOf(url);
  if (!host || LOOPBACK.has(host) || host.endsWith(".local")) {
    throw new Error(
      `EXPO_PUBLIC_API_BASE_URL must be a public HTTPS host for ${appEnv}, not ${host ?? url}.`,
    );
  }

  if (input.easBuild && !(input.easProjectId && String(input.easProjectId).trim())) {
    throw new Error("EAS_PROJECT_ID is required for staging/production EAS builds.");
  }
}

module.exports = {
  normalizeMobileAppEnv,
  isCleartextAllowed,
  assertMobileReleaseEnv,
};
