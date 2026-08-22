import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  linkAppleSchema,
  linkGoogleSchema,
  linkTestOauthSchema,
  setPasswordSchema,
  unlinkIdentityParamSchema,
  type LinkAppleInput,
  type LinkGoogleInput,
  type LinkTestOauthInput,
  type SetPasswordInput,
  type UnlinkIdentityParam,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import { AuthService } from "./auth.service";
import type { RequestUser } from "./request-user";

@Controller("v1/me")
export class AuthAccountController {
  constructor(private readonly auth: AuthService) {}

  @Get("auth-identities")
  identities(@CurrentUser() user: RequestUser) {
    return this.auth.listAuthMethods(user);
  }

  @Get("sessions")
  sessions(@CurrentUser() user: RequestUser) {
    return this.auth.listSessions(user);
  }

  @Delete("sessions/:id")
  @HttpCode(204)
  async revokeSession(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.auth.revokeSession(user, id);
  }

  @Post("sessions/revoke-all")
  @HttpCode(204)
  async revokeAll(@CurrentUser() user: RequestUser) {
    await this.auth.revokeAllSessions(user);
  }

  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post("auth-identities/link/google")
  linkGoogle(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(linkGoogleSchema)) body: LinkGoogleInput,
  ) {
    return this.auth.linkGoogle(user, body);
  }

  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post("auth-identities/link/apple")
  linkApple(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(linkAppleSchema)) body: LinkAppleInput,
  ) {
    return this.auth.linkApple(user, body);
  }

  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post("auth-identities/link/test")
  linkTest(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(linkTestOauthSchema)) body: LinkTestOauthInput,
  ) {
    return this.auth.linkTestOauth(user, body);
  }

  @Delete("auth-identities/:provider")
  unlink(
    @CurrentUser() user: RequestUser,
    @Param("provider", new ZodPipe(unlinkIdentityParamSchema)) provider: UnlinkIdentityParam,
  ) {
    return this.auth.unlinkIdentity(user, provider);
  }

  @Post("password")
  @HttpCode(204)
  async setPassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(setPasswordSchema)) body: SetPasswordInput,
  ) {
    await this.auth.setPassword(user, body);
  }
}
