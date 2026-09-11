import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ADMIN_OPS_ROLES } from "@tcg/config";
import {
  adminCatalogApproveSchema,
  adminCatalogRejectSchema,
  adminCatalogReviewSchema,
  adminCatalogSubmissionsQuerySchema,
  catalogSubmissionIdParamSchema,
  type AdminCatalogApproveInput,
  type AdminCatalogRejectInput,
  type AdminCatalogReviewInput,
  type AdminCatalogSubmissionsQuery,
} from "@tcg/validation";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodPipe } from "../../common/pipes/zod-pipe";
import type { RequestUser } from "../../auth/request-user";
import { CatalogSubmissionsService } from "./catalog-submissions.service";

@Controller("v1/admin/catalog/submissions")
@Roles(...ADMIN_OPS_ROLES)
export class AdminCatalogSubmissionsController {
  constructor(private readonly submissions: CatalogSubmissionsService) {}

  @Get()
  list(@Query(new ZodPipe(adminCatalogSubmissionsQuerySchema)) query: AdminCatalogSubmissionsQuery) {
    return this.submissions.listAdmin(query);
  }

  @Get(":id")
  get(@Param("id", new ZodPipe(catalogSubmissionIdParamSchema)) id: string) {
    return this.submissions.getAdmin(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(":id/approve")
  approve(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(catalogSubmissionIdParamSchema)) id: string,
    @Body(new ZodPipe(adminCatalogApproveSchema)) body: AdminCatalogApproveInput,
  ) {
    return this.submissions.approve(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(":id/reject")
  reject(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(catalogSubmissionIdParamSchema)) id: string,
    @Body(new ZodPipe(adminCatalogRejectSchema)) body: AdminCatalogRejectInput,
  ) {
    return this.submissions.reject(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(":id/duplicate")
  duplicate(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(catalogSubmissionIdParamSchema)) id: string,
    @Body(new ZodPipe(adminCatalogReviewSchema)) body: AdminCatalogReviewInput,
  ) {
    return this.submissions.markDuplicate(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post(":id/needs-info")
  needsInfo(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(catalogSubmissionIdParamSchema)) id: string,
    @Body(new ZodPipe(adminCatalogRejectSchema)) body: AdminCatalogRejectInput,
  ) {
    return this.submissions.needsInfo(user, id, body);
  }
}
