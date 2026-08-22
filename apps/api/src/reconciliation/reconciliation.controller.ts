import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ADMIN_OPS_ROLES } from "@tcg/config";
import {
  adminReconIssuesQuerySchema,
  adminReconResolveSchema,
  adminReconRunSchema,
  adminReconRunsQuerySchema,
  uuidParamSchema,
  type AdminReconIssuesQuery,
  type AdminReconResolveInput,
  type AdminReconRunInput,
  type AdminReconRunsQuery,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { ReconciliationService } from "./reconciliation.service";

@Controller("v1/admin/reconciliation")
@Roles(...ADMIN_OPS_ROLES)
export class ReconciliationController {
  constructor(private readonly recon: ReconciliationService) {}

  @Get()
  dashboard() {
    return this.recon.dashboard();
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("run")
  run(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(adminReconRunSchema)) body: AdminReconRunInput,
  ) {
    return this.recon.run(user, body);
  }

  @Get("runs")
  runs(@Query(new ZodPipe(adminReconRunsQuerySchema)) query: AdminReconRunsQuery) {
    return this.recon.listRuns(query);
  }

  @Get("runs/:id")
  runById(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.recon.getRun(id);
  }

  @Get("issues")
  issues(@Query(new ZodPipe(adminReconIssuesQuerySchema)) query: AdminReconIssuesQuery) {
    return this.recon.listIssues(query);
  }

  @Get("issues/:id")
  issueById(@Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.recon.getIssue(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("issues/:id/acknowledge")
  acknowledge(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
  ) {
    return this.recon.acknowledge(user, id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("issues/:id/resolve")
  resolve(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(adminReconResolveSchema)) body: AdminReconResolveInput,
  ) {
    return this.recon.resolve(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("issues/:id/ignore")
  ignore(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
  ) {
    return this.recon.ignore(user, id);
  }
}
