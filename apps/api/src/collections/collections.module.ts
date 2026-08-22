import { Module } from "@nestjs/common";
import { CollectionItemsController } from "./collection-items.controller";
import { CollectionsController } from "./collections.controller";
import { CollectionsService } from "./collections.service";

@Module({
  controllers: [CollectionsController, CollectionItemsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
