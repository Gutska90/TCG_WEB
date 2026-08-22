import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { paginationQuerySchema, type PaginationQuery } from "@tcg/validation";
import {
  bulkDeleteCollectionItemsSchema,
  createCollectionItemSchema,
  listCollectionItemsQuerySchema,
  patchCollectionItemSchema,
  type BulkDeleteCollectionItemsInput,
  type CreateCollectionItemInput,
  type ListCollectionItemsQuery,
  type PatchCollectionItemInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { CollectionsService } from "./collections.service";

@Controller("v1/me/collection")
export class CollectionItemsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get("summary")
  summary(@CurrentUser() user: RequestUser) {
    return this.collections.summary(user.id);
  }

  @Get("sets")
  sets(@CurrentUser() user: RequestUser) {
    return this.collections.listSetProgress(user.id);
  }

  @Get("sets/:setId")
  setDetail(
    @CurrentUser() user: RequestUser,
    @Param("setId") setId: string,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.collections.setDetail(user.id, setId, query.page, query.pageSize);
  }

  @Get("items")
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(listCollectionItemsQuerySchema)) query: ListCollectionItemsQuery,
  ) {
    return this.collections.listItems(user.id, query);
  }

  @Post("items")
  add(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createCollectionItemSchema)) body: CreateCollectionItemInput,
  ) {
    return this.collections.addItem(user.id, body);
  }

  @Post("items/bulk-delete")
  bulkDelete(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(bulkDeleteCollectionItemsSchema)) body: BulkDeleteCollectionItemsInput,
  ) {
    return this.collections.bulkDelete(user.id, body);
  }

  @Get("items/:id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.collections.getItem(user.id, id);
  }

  @Patch("items/:id")
  patch(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodPipe(patchCollectionItemSchema)) body: PatchCollectionItemInput,
  ) {
    return this.collections.patchItem(user.id, id, body);
  }

  @Delete("items/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.collections.deleteItem(user.id, id);
  }
}
