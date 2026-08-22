import { Module } from "@nestjs/common";
import { ListingsModule } from "../listings/listings.module";
import { PricesService } from "./prices.service";

@Module({
  imports: [ListingsModule],
  providers: [PricesService],
  exports: [PricesService],
})
export class PricesModule {}
