import { Module, forwardRef } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { OrdersModule } from "../orders/orders.module";
import { PayoutsModule } from "../payouts/payouts.module";
import { CheckoutController } from "../orders/checkout.controller";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { MercadoPagoPaymentProvider } from "./mercadopago.provider";
import { LocalPaymentProvider } from "./local-payment.provider";
import { PAYMENT_PROVIDER, type PaymentProvider } from "./payment-provider";
import { RefundsService } from "./refunds.service";

@Module({
  imports: [forwardRef(() => OrdersModule), LedgerModule, PayoutsModule],
  controllers: [PaymentsController, CheckoutController],
  providers: [
    MercadoPagoPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [MercadoPagoPaymentProvider],
      useFactory: (mp: MercadoPagoPaymentProvider): PaymentProvider => {
        if (mp.isConfigured()) return mp;
        if (process.env.NODE_ENV === "production") return mp;
        return new LocalPaymentProvider();
      },
    },
    RefundsService,
    PaymentsService,
  ],
  exports: [PaymentsService, RefundsService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
