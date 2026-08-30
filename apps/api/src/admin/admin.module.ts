import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentsModule } from "../payments/payments.module";
import { PayoutsModule } from "../payouts/payouts.module";
import { SellerPlansModule } from "../seller-plans/seller-plans.module";
import { AdminActionsService } from "./admin-actions.service";
import { AdminController } from "./admin.controller";
import { AdminOpsService } from "./admin-ops.service";

@Module({
  imports: [OrdersModule, PaymentsModule, LedgerModule, PayoutsModule, SellerPlansModule],
  controllers: [AdminController],
  providers: [AdminOpsService, AdminActionsService],
})
export class AdminModule {}
