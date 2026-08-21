import { Module } from "@nestjs/common";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";
import { MarketService } from "./market.service";
import { MeListingsController } from "./me-listings.controller";
import { RatingsModule } from "../ratings/ratings.module";

@Module({
  imports: [RatingsModule],
  controllers: [ListingsController, MeListingsController],
  providers: [ListingsService, MarketService],
  exports: [ListingsService, MarketService],
})
export class ListingsModule {}
