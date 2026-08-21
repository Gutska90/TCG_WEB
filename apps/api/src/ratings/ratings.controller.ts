import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  createRatingSchema,
  paginationQuerySchema,
  type CreateRatingInput,
  type PaginationQuery,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { RatingsService } from "./ratings.service";

@Controller("v1")
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  @Public()
  @Get("users/:id/ratings")
  list(
    @Param("id") id: string,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.ratings.listPublic(id, query);
  }

  @Post("orders/:id/rating")
  rate(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodPipe(createRatingSchema)) body: CreateRatingInput,
  ) {
    return this.ratings.rate(user, id, body);
  }
}
