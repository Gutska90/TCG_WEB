import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";
import { ReconciliationModule } from "../reconciliation/reconciliation.module";
import { CollectionsModule } from "../collections/collections.module";
import { PricesModule } from "../prices/prices.module";
import { WishlistModule } from "../wishlist/wishlist.module";
import { JobRunner } from "./job-runner";
import { JobScheduler } from "./job-scheduler";
import { JobsService } from "./jobs.service";

@Module({
  imports: [OrdersModule, PaymentsModule, ReconciliationModule, PricesModule, CollectionsModule, WishlistModule],
  providers: [JobRunner, JobsService, JobScheduler],
  exports: [JobRunner, JobsService, JobScheduler],
})
export class JobsModule {}
