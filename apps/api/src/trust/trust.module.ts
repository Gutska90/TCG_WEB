import { Module } from "@nestjs/common";
import { MarketService } from "../listings/market.service";
import { PayoutsModule } from "../payouts/payouts.module";
import { AdminTrustController } from "./admin-trust.controller";
import { DisputesController } from "./disputes.controller";
import { DisputesService } from "./disputes.service";
import { ListingRevisionService } from "./listing-revision.service";
import { ModerationLogService } from "./moderation-log.service";
import { ModerationService } from "./moderation.service";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [PayoutsModule],
  controllers: [DisputesController, ReportsController, AdminTrustController],
  providers: [
    MarketService,
    ListingRevisionService,
    ModerationLogService,
    DisputesService,
    ReportsService,
    ModerationService,
  ],
  exports: [ListingRevisionService, DisputesService, ReportsService, ModerationService],
})
export class TrustModule {}
