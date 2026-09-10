import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { GameFiltersService } from "./game-filters.service";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";
import { CatalogSubmissionsController } from "./submissions/catalog-submissions.controller";
import { AdminCatalogSubmissionsController } from "./submissions/admin-catalog-submissions.controller";
import { CatalogSubmissionsService } from "./submissions/catalog-submissions.service";
import { ListingsModule } from "../listings/listings.module";
import { PricesModule } from "../prices/prices.module";

@Module({
  imports: [ListingsModule, PricesModule],
  controllers: [
    CatalogController,
    FavoritesController,
    CatalogSubmissionsController,
    AdminCatalogSubmissionsController,
  ],
  providers: [CatalogService, FavoritesService, GameFiltersService, CatalogSubmissionsService],
  exports: [CatalogService, CatalogSubmissionsService],
})
export class CatalogModule {}
