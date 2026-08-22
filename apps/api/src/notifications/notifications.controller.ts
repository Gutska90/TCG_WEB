import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  paginationQuerySchema,
  patchNotificationPreferenceSchema,
  type PaginationQuery,
  type PatchNotificationPreferenceInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { NotificationsService } from "./notifications.service";

@Controller("v1/me")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("notifications")
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(paginationQuerySchema)) query: PaginationQuery,
  ) {
    return this.notifications.list(user.id, query.page, query.pageSize);
  }

  @Post("notifications/read-all")
  readAll(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post("notifications/:id/read")
  read(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Get("notification-preferences")
  prefs(@CurrentUser() user: RequestUser) {
    return this.notifications.listPreferences(user.id);
  }

  @Patch("notification-preferences")
  patchPrefs(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(patchNotificationPreferenceSchema)) body: PatchNotificationPreferenceInput,
  ) {
    return this.notifications.patchPreference(user.id, body);
  }
}
