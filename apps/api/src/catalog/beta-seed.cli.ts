import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { seedBeta } from "./beta-seed";

config({ path: resolve(__dirname, "../../../../.env") });

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedBeta(prisma);
    console.log(`Beta seed listo. Listing ${result.listingId} (${result.cardName}).`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
