import { resolve } from "node:path";
import { config } from "dotenv";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { MercadoPagoPaymentProvider } from "../payments/mercadopago.provider";
import { PrismaService } from "../prisma/prisma.service";
import { ReconciliationService } from "./reconciliation.service";
import { MetricsService } from "../observability/metrics.service";

config({ path: resolve(__dirname, "../../../../.env") });

/**
 * Job diario MVP (sin BullMQ): `pnpm recon:day`.
 * No corre contra credenciales live salvo RECON_ALLOW_LIVE=true.
 * Cron sugerido: 0 6 * * * (America/Santiago) → últimas 48h.
 */
async function main() {
  if (process.env.NODE_ENV === "production" && process.env.RECON_ALLOW_LIVE !== "true") {
    console.log("Skip recon: production requiere RECON_ALLOW_LIVE=true");
    return;
  }
  const prisma = new PrismaClient();
  const configService = new ConfigService();
  const provider = new MercadoPagoPaymentProvider(configService);
  if (!provider.isConfigured()) {
    console.log("Skip recon: MP_ACCESS_TOKEN vacío (no se usa live por defecto)");
    await prisma.$disconnect();
    return;
  }
  const audit = new AuditService(prisma as unknown as PrismaService);
  const recon = new ReconciliationService(prisma as unknown as PrismaService, audit, provider, new MetricsService());
  try {
    const run = await recon.run(null, {});
    console.log(JSON.stringify(run, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
