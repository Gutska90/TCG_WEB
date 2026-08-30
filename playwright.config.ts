import { defineConfig, devices } from "@playwright/test";

const web = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const api = process.env.E2E_API_URL ?? "http://localhost:4000";
const admin = process.env.E2E_ADMIN_URL ?? "http://localhost:3002";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: web,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @tcg/api start",
      url: `${api}/health`,
      reuseExistingServer: process.env.E2E_REUSE === "1",
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV ?? "development",
        PORT: "4000",
        ENABLE_REAL_PAYMENTS: "false",
        JOBS_ENABLED: "false",
        REDIS_URL: "",
        CORS_ORIGINS: "http://localhost:3000,http://localhost:3002",
        APP_WEB_URL: web,
        APP_ADMIN_URL: admin,
        ENABLE_GOOGLE_AUTH: "true",
        ENABLE_APPLE_AUTH: "true",
        AUTH_STUB_OAUTH: "true",
        ENABLE_COLLECTIONS: "true",
        ENABLE_PRICES: "true",
        ENABLE_WISHLIST: "true",
        ENABLE_PAYOUTS: "true",
        DISABLE_PAYOUTS: "false",
        E2E_RELAX_THROTTLE: "true",
      },
    },
    {
      command: "pnpm --filter @tcg/web start",
      url: web,
      reuseExistingServer: process.env.E2E_REUSE === "1",
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @tcg/admin start",
      url: admin,
      reuseExistingServer: process.env.E2E_REUSE === "1",
      timeout: 120_000,
    },
  ],
});
