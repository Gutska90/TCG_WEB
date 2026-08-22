import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { loadFeatureFlags } from "@tcg/config";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { MarketService } from "../listings/market.service";
import { PricesService } from "./prices.service";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

async function main() {
  const prisma = new PrismaClient();
  const flags = new FeatureFlagsService().use(loadFeatureFlags());
  const prices = new PricesService(prisma as never, new MarketService(prisma as never), flags);
  try {
    const result = await prices.captureDay();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
