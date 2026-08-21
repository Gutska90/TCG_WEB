import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tcg/config", "@tcg/types", "@tcg/validation"],
};

export default nextConfig;
