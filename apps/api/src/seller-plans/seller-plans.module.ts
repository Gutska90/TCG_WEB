import { Module } from "@nestjs/common";
import { SellerPlanService } from "./seller-plan.service";
import { MarketplaceFeeService } from "./marketplace-fee.service";
import { SellerPlansController } from "./seller-plans.controller";

@Module({
  controllers: [SellerPlansController],
  providers: [SellerPlanService, MarketplaceFeeService],
  exports: [SellerPlanService, MarketplaceFeeService],
})
export class SellerPlansModule {}
