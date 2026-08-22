import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { backfillLedger } from "./backfill";
import { LedgerService } from "./ledger.service";
import { PrismaService } from "../prisma/prisma.service";

config({ path: resolve(__dirname, "../../../../.env") });

async function main() {
  const prisma = new PrismaClient();
  // CLI: PrismaClient expone el mismo `ledgerEntry` que PrismaService.
  const ledger = new LedgerService(prisma as unknown as PrismaService);
  try {
    const summary = await backfillLedger(prisma, ledger);
    console.log("Ledger backfill (idempotente). No corre solo en production.");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
