import { Module, forwardRef } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { ShippingModule } from "../shipping/shipping.module";
import { LedgerModule } from "../ledger/ledger.module";
import { CollectionsModule } from "../collections/collections.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SellerPlansModule } from "../seller-plans/seller-plans.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [
    ShippingModule,
    LedgerModule,
    CollectionsModule,
    NotificationsModule,
    SellerPlansModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
