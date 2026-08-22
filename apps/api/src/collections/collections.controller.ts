import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import {
  createCollectionSchema,
  patchCollectionSchema,
  type CreateCollectionInput,
  type PatchCollectionInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { CollectionsService } from "./collections.service";

@Controller("v1/me/collections")
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.collections.listCollections(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createCollectionSchema)) body: CreateCollectionInput,
  ) {
    return this.collections.createCollection(user.id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.collections.getCollection(user.id, id);
  }

  @Patch(":id")
  patch(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodPipe(patchCollectionSchema)) body: PatchCollectionInput,
  ) {
    return this.collections.patchCollection(user.id, id, body);
  }
}
