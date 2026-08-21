import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { FavoritesController } from "./favorites.controller";
import { FavoritesService } from "./favorites.service";
import { ListingsModule } from "../listings/listings.module";

@Module({
  imports: [ListingsModule],
  controllers: [CatalogController, FavoritesController],
  providers: [CatalogService, FavoritesService],
  exports: [CatalogService],
})
export class CatalogModule {}
