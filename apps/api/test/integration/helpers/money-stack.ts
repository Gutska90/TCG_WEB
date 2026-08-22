import { AuditService } from "../../../src/audit/audit.service";
import { LedgerService } from "../../../src/ledger/ledger.service";
import { SellerBalanceService } from "../../../src/ledger/seller-balance.service";
import { CollectionsService } from "../../../src/collections/collections.service";
import { OrdersService } from "../../../src/orders/orders.service";
import { RefundsService } from "../../../src/payments/refunds.service";
import { ManualPayoutProvider } from "../../../src/payouts/manual-payout.provider";
import { PayoutsService } from "../../../src/payouts/payouts.service";
import { PrismaService } from "../../../src/prisma/prisma.service";
import { ShippingService } from "../../../src/shipping/shipping.service";
import type { PaymentProvider } from "../../../src/payments/payment-provider";
import { flagsForTest } from "../../../src/flags/feature-flags.service";
import { MetricsService } from "../../../src/observability/metrics.service";

export function createMoneyServices(prisma: PrismaService, provider: PaymentProvider) {
  const audit = new AuditService(prisma);
  const ledger = new LedgerService(prisma);
  const balances = new SellerBalanceService(prisma);
  const flags = flagsForTest({ enablePayouts: true });
  const metrics = new MetricsService();
  const payouts = new PayoutsService(prisma, audit, ledger, balances, new ManualPayoutProvider(), flags, metrics);
  const refunds = new RefundsService(prisma, audit, provider, ledger, payouts, metrics);
  const shipping = new ShippingService(prisma);
  const collections = new CollectionsService(prisma, flags, audit);
  const orders = new OrdersService(prisma, audit, shipping, refunds, ledger, flags, metrics, collections);
  return { audit, ledger, balances, payouts, refunds, shipping, orders, flags, metrics, collections };
}
