import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  catalogSubmissionIdParamSchema,
  createCatalogSubmissionSchema,
  listMyCatalogSubmissionsQuerySchema,
  patchMyCatalogSubmissionSchema,
  type CreateCatalogSubmissionInput,
  type ListMyCatalogSubmissionsQuery,
  type PatchMyCatalogSubmissionInput,
} from "@tcg/validation";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodPipe } from "../../common/pipes/zod-pipe";
import type { RequestUser } from "../../auth/request-user";
import { CatalogSubmissionsService } from "./catalog-submissions.service";

@Controller("v1")
export class CatalogSubmissionsController {
  constructor(private readonly submissions: CatalogSubmissionsService) {}

  @Roles("USER", "SELLER", "STORE", "MODERATOR", "ADMIN", "SUPER_ADMIN")
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @Post("catalog/submissions")
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createCatalogSubmissionSchema)) body: CreateCatalogSubmissionInput,
  ) {
    return this.submissions.create(user, body);
  }

  @Roles("USER", "SELLER", "STORE", "MODERATOR", "ADMIN", "SUPER_ADMIN")
  @Get("me/catalog-submissions")
  listMine(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(listMyCatalogSubmissionsQuerySchema)) query: ListMyCatalogSubmissionsQuery,
  ) {
    return this.submissions.listMine(user.id, query.page, query.pageSize);
  }

  @Roles("USER", "SELLER", "STORE", "MODERATOR", "ADMIN", "SUPER_ADMIN")
  @Get("me/catalog-submissions/:id")
  getMine(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(catalogSubmissionIdParamSchema)) id: string,
  ) {
    return this.submissions.getMine(user.id, id);
  }

  @Roles("USER", "SELLER", "STORE", "MODERATOR", "ADMIN", "SUPER_ADMIN")
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @Patch("me/catalog-submissions/:id")
  resubmit(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(catalogSubmissionIdParamSchema)) id: string,
    @Body(new ZodPipe(patchMyCatalogSubmissionSchema)) body: PatchMyCatalogSubmissionInput,
  ) {
    return this.submissions.resubmit(user, id, body);
  }
}
