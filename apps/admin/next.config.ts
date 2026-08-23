import type { NextConfig } from "next";
import { enableHstsFromEnv, nextDocumentHeaders } from "@tcg/config/http-security";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";
const securityHeaders = nextDocumentHeaders({
  isDev: process.env.NODE_ENV !== "production",
  enableHsts: enableHstsFromEnv(process.env),
  googleGsi: false,
});

const nextConfig: NextConfig = {
  transpilePackages: ["@tcg/config", "@tcg/types", "@tcg/validation", "@tcg/ui"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` }];
  },
};

export default nextConfig;
