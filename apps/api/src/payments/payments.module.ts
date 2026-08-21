import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { CheckoutController } from "../orders/checkout.controller";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController, CheckoutController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
