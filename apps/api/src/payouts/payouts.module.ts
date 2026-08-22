import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { ManualPayoutProvider } from "./manual-payout.provider";
import { PAYOUT_PROVIDER } from "./payout-provider";
import { PayoutsService } from "./payouts.service";

@Module({
  imports: [LedgerModule],
  providers: [
    ManualPayoutProvider,
    { provide: PAYOUT_PROVIDER, useExisting: ManualPayoutProvider },
    PayoutsService,
  ],
  exports: [PayoutsService, PAYOUT_PROVIDER],
})
export class PayoutsModule {}
