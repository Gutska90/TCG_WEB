import { HttpCode, HttpStatus, Controller, Delete, Get, Param, Put, Query } from "@nestjs/common";
import { paginationQuerySchema, type PaginationQuery } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { FavoritesService } from "./favorites.service";

@Controller("v1/me/favorites")
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.favorites.list(user.id, query.page, query.pageSize);
  }

  @Put(":variantId")
  put(@CurrentUser() user: RequestUser, @Param("variantId") variantId: string) {
    return this.favorites.add(user.id, variantId);
  }

  @Delete(":variantId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: RequestUser, @Param("variantId") variantId: string) {
    await this.favorites.remove(user.id, variantId);
  }
}
