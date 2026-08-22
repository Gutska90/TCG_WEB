import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ADMIN_OPS_ROLES, MODERATION_ROLES } from "@tcg/config";
import {
  adminDisputeResolveSchema,
  adminDisputeStatusSchema,
  adminDisputesQuerySchema,
  adminModerationReasonSchema,
  adminReportResolveSchema,
  adminReportsQuerySchema,
  paginationQuerySchema,
  uuidParamSchema,
  type AdminDisputeResolveInput,
  type AdminDisputeStatusInput,
  type AdminDisputesQuery,
  type AdminModerationReasonInput,
  type AdminReportResolveInput,
  type AdminReportsQuery,
  type PaginationQuery,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { DisputesService } from "./disputes.service";
import { ModerationLogService } from "./moderation-log.service";
import { ModerationService } from "./moderation.service";
import { ReportsService } from "./reports.service";

@Controller("v1/admin")
@Roles(...MODERATION_ROLES)
export class AdminTrustController {
  constructor(
    private readonly disputes: DisputesService,
    private readonly reports: ReportsService,
    private readonly moderation: ModerationService,
    private readonly log: ModerationLogService,
  ) {}

  @Get("disputes")
  listDisputes(@Query(new ZodPipe(adminDisputesQuerySchema)) query: AdminDisputesQuery) {
    return this.disputes.listAdmin(query);
  }

  @Get("disputes/:id")
  getDispute(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
  ) {
    return this.disputes.getAdmin(user, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("disputes/:id/assign")
  assignDispute(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
  ) {
    return this.disputes.assign(user, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("disputes/:id/status")
  statusDispute(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminDisputeStatusSchema)) body: AdminDisputeStatusInput,
  ) {
    return this.disputes.setStatus(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("disputes/:id/resolve")
  resolveDispute(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminDisputeResolveSchema)) body: AdminDisputeResolveInput,
  ) {
    return this.disputes.resolve(user, id, body);
  }

  @Get("reports")
  listReports(@Query(new ZodPipe(adminReportsQuerySchema)) query: AdminReportsQuery) {
    return this.reports.listAdmin(query);
  }

  @Get("reports/:id")
  getReport(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
  ) {
    return this.reports.getAdmin(user, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("reports/:id/assign")
  assignReport(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
  ) {
    return this.reports.assign(user, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("reports/:id/resolve")
  resolveReport(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminReportResolveSchema)) body: AdminReportResolveInput,
  ) {
    return this.reports.resolve(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("listings/:id/pause")
  pauseListing(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminModerationReasonSchema)) body: AdminModerationReasonInput,
  ) {
    return this.moderation.pauseListing(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("listings/:id/restore")
  restoreListing(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminModerationReasonSchema)) body: AdminModerationReasonInput,
  ) {
    return this.moderation.restoreListing(user, id, body);
  }

  @Roles(...ADMIN_OPS_ROLES)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("sellers/:id/suspend")
  suspendSeller(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminModerationReasonSchema)) body: AdminModerationReasonInput,
  ) {
    return this.moderation.suspendSeller(user, id, body);
  }

  @Roles(...ADMIN_OPS_ROLES)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("sellers/:id/restore")
  restoreSeller(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminModerationReasonSchema)) body: AdminModerationReasonInput,
  ) {
    return this.moderation.restoreSeller(user, id, body);
  }

  @Get("moderation/actions")
  actions(@Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.log.list(query.page, query.pageSize);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("users/:id/warn")
  warn(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminModerationReasonSchema)) body: AdminModerationReasonInput,
  ) {
    return this.moderation.warnUser(user, id, body);
  }
}
