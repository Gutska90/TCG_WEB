import { Controller, Get, Query } from "@nestjs/common";
import { paginationQuerySchema, type PaginationQuery } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { ListingsService } from "./listings.service";

@Roles("SELLER", "STORE", "ADMIN", "SUPER_ADMIN")
@Controller("v1/me/listings")
export class MeListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.listings.listMine(user.id, query.page, query.pageSize);
  }
}
