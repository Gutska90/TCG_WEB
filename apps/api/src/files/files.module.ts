import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { createObjectStoreFromEnv, OBJECT_STORE } from "./object-store";

@Module({
  controllers: [FilesController],
  providers: [
    {
      provide: OBJECT_STORE,
      useFactory: () => createObjectStoreFromEnv(process.env),
    },
    FilesService,
  ],
  exports: [FilesService],
})
export class FilesModule {}
