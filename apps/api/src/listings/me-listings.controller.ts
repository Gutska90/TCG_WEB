import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { paginationQuerySchema, bulkListingPreviewSchema, type PaginationQuery, type BulkListingPreviewInput } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { ListingsService } from "./listings.service";
import { BulkListingsService } from "./bulk-listings.service";

@Roles("SELLER", "STORE", "ADMIN", "SUPER_ADMIN")
@Controller("v1/me/listings")
export class MeListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly bulk: BulkListingsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.listings.listMine(user.id, query.page, query.pageSize);
  }

  @Post("bulk/preview")
  preview(
    @CurrentUser() _user: RequestUser,
    @Body(new ZodPipe(bulkListingPreviewSchema)) body: BulkListingPreviewInput,
  ) {
    return this.bulk.preview(body);
  }
}
