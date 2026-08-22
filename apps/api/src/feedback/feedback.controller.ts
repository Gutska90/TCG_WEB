import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ADMIN_OPS_ROLES } from "@tcg/config";
import {
  createFeedbackSchema,
  paginationQuerySchema,
  type CreateFeedbackInput,
  type PaginationQuery,
} from "@tcg/validation";
import type { Request } from "express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { FeedbackService } from "./feedback.service";

@Controller("v1")
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 10 * 60_000 } })
  @Post("feedback")
  create(
    @Body(new ZodPipe(createFeedbackSchema)) body: CreateFeedbackInput,
    @CurrentUser() user: RequestUser | undefined,
    @Req() req: Request,
  ) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : req.ip;
    return this.feedback.create(body, { user, ip });
  }

  @Get("admin/feedback")
  @Roles(...ADMIN_OPS_ROLES)
  list(@Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.feedback.list(query.page, query.pageSize);
  }
}
