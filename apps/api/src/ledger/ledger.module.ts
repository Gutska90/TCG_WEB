import { Module } from "@nestjs/common";
import { SellerBalanceController } from "./seller-balance.controller";
import { LedgerAdjustmentService } from "./ledger-adjustment.service";
import { LedgerQueryService } from "./ledger-query.service";
import { LedgerService } from "./ledger.service";
import { SellerBalanceService } from "./seller-balance.service";

@Module({
  controllers: [SellerBalanceController],
  providers: [LedgerService, SellerBalanceService, LedgerQueryService, LedgerAdjustmentService],
  exports: [LedgerService, SellerBalanceService, LedgerQueryService, LedgerAdjustmentService],
})
export class LedgerModule {}
