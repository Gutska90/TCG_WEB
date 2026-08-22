import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query } from "@nestjs/common";
import { paginationQuerySchema, upsertWishlistItemSchema, type PaginationQuery, type UpsertWishlistItemInput } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { WishlistService } from "./wishlist.service";

@Controller("v1/me/wishlist")
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.wishlist.list(user.id, query.page, query.pageSize);
  }

  @Put(":variantId")
  put(
    @CurrentUser() user: RequestUser,
    @Param("variantId") variantId: string,
    @Body(new ZodPipe(upsertWishlistItemSchema)) body: UpsertWishlistItemInput,
  ) {
    return this.wishlist.upsert(user.id, variantId, body);
  }

  @Delete(":variantId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: RequestUser, @Param("variantId") variantId: string) {
    return this.wishlist.remove(user.id, variantId);
  }
}
