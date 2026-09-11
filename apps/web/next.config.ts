import type { NextConfig } from "next";
import { enableHstsFromEnv, nextDocumentHeaders } from "@tcg/config/http-security";

const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:4000";
const securityHeaders = nextDocumentHeaders({
  isDev: process.env.NODE_ENV !== "production",
  enableHsts: enableHstsFromEnv(process.env),
  googleGsi: true,
});

const nextConfig: NextConfig = {
  transpilePackages: ["@tcg/config", "@tcg/ui", "@tcg/types", "@tcg/validation"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.myl.cl", pathname: "/**" },
      { protocol: "https", hostname: "tor.myl.cl", pathname: "/**" },
      { protocol: "https", hostname: "cards.scryfall.io", pathname: "/**" },
      { protocol: "https", hostname: "c1.scryfall.com", pathname: "/**" },
      { protocol: "https", hostname: "images.pokemontcg.io", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    qualities: [72, 75],
    // Catalog tiles are ~280px CSS; skip 2K/4K variants the optimizer would otherwise emit.
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` }];
  },
};

export default nextConfig;
