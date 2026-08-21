import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createListingSchema,
  listListingsQuerySchema,
  patchListingSchema,
  type CreateListingInput,
  type ListListingsQuery,
  type PatchListingInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { ListingsService } from "./listings.service";

@Controller("v1/listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Public()
  @Get()
  list(@Query(new ZodPipe(listListingsQuerySchema)) query: ListListingsQuery) {
    return this.listings.listPublic(query);
  }

  @Public()
  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user?: RequestUser) {
    return this.listings.getPublic(id, user?.id);
  }

  @Roles("SELLER", "STORE", "ADMIN", "SUPER_ADMIN")
  @Post()
  create(@CurrentUser() user: RequestUser, @Body(new ZodPipe(createListingSchema)) body: CreateListingInput) {
    return this.listings.create(user, body);
  }

  @Roles("SELLER", "STORE", "ADMIN", "SUPER_ADMIN")
  @Patch(":id")
  patch(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodPipe(patchListingSchema)) body: PatchListingInput,
  ) {
    return this.listings.update(user, id, body);
  }

  @Roles("SELLER", "STORE", "ADMIN", "SUPER_ADMIN")
  @Post(":id/pause")
  pause(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.listings.pause(user, id);
  }

  @Roles("SELLER", "STORE", "ADMIN", "SUPER_ADMIN")
  @Post(":id/activate")
  activate(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.listings.activate(user, id);
  }

  @Roles("SELLER", "STORE", "ADMIN", "SUPER_ADMIN")
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.listings.cancel(user, id);
  }
}
