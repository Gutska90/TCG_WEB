import type { PublicPlatformConfig } from "@tcg/types";
import { api } from "./api";

export function fetchPublicConfig(): Promise<PublicPlatformConfig> {
  return api<PublicPlatformConfig>("/v1/config");
}
