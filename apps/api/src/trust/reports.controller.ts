import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  createReportSchema,
  paginationQuerySchema,
  uuidParamSchema,
  type CreateReportInput,
  type PaginationQuery,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { ReportsService } from "./reports.service";

@Controller("v1")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("reports")
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createReportSchema)) body: CreateReportInput,
  ) {
    return this.reports.create(user, body);
  }

  @Get("me/reports")
  mine(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.reports.listMine(user, query.page, query.pageSize);
  }

  @Get("me/reports/:id")
  getMine(@CurrentUser() user: RequestUser, @Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.reports.getMine(user, id);
  }
}
