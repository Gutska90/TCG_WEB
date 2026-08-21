import { Module, forwardRef } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { CheckoutController } from "../orders/checkout.controller";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { MercadoPagoPaymentProvider } from "./mercadopago.provider";
import { PAYMENT_PROVIDER } from "./payment-provider";
import { RefundsService } from "./refunds.service";

@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [PaymentsController, CheckoutController],
  providers: [
    MercadoPagoPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MercadoPagoPaymentProvider },
    RefundsService,
    PaymentsService,
  ],
  exports: [PaymentsService, RefundsService],
})
export class PaymentsModule {}
