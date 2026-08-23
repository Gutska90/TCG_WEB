import { Body, Controller, Get, Header, Param, Post, Query, StreamableFile } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  disputeEvidenceSchema,
  disputeMessageSchema,
  openDisputeSchema,
  paginationQuerySchema,
  uuidParamSchema,
  type DisputeEvidenceInput,
  type DisputeMessageInput,
  type OpenDisputeInput,
  type PaginationQuery,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { DisputesService } from "./disputes.service";

@Controller("v1")
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("orders/:id/disputes")
  open(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(openDisputeSchema)) body: OpenDisputeInput,
  ) {
    return this.disputes.open(user, id, body);
  }

  @Get("me/disputes")
  mine(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.disputes.listMine(user, query.page, query.pageSize);
  }

  @Get("disputes/:id")
  get(@CurrentUser() user: RequestUser, @Param("id", new ZodPipe(uuidParamSchema)) id: string) {
    return this.disputes.get(user, id);
  }

  @Get("disputes/:id/evidence/:evidenceId/file")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  async evidenceFile(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Param("evidenceId", new ZodPipe(uuidParamSchema)) evidenceId: string,
  ): Promise<StreamableFile> {
    const file = await this.disputes.streamEvidenceFile(user, id, evidenceId);
    return new StreamableFile(file.body, {
      type: file.mime,
      length: file.size,
      disposition: "inline",
    });
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post("disputes/:id/messages")
  message(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(disputeMessageSchema)) body: DisputeMessageInput,
  ) {
    return this.disputes.addMessage(user, id, body);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("disputes/:id/evidence")
  evidence(
    @CurrentUser() user: RequestUser,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Body(new ZodPipe(disputeEvidenceSchema)) body: DisputeEvidenceInput,
  ) {
    return this.disputes.addEvidence(user, id, body);
  }
}
