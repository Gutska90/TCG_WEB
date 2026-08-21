import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { PLATFORM } from "@tcg/config";
import {
  appleAuthSchema,
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type AppleAuthInput,
  type ForgotPasswordInput,
  type GoogleAuthInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import { AuthService } from "./auth.service";
import type { RequestUser } from "./request-user";

const REFRESH_COOKIE = "Refresh";

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post("register")
  async register(
    @Body(new ZodPipe(registerSchema)) body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.register(body, this.ctx(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post("login")
  async login(
    @Body(new ZodPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(body, this.ctx(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Body(new ZodPipe(refreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = body.refreshToken ?? this.readCookie(req);
    const tokens = await this.auth.refresh(raw, this.ctx(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@CurrentUser() user: RequestUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user);
    this.clearRefreshCookie(res);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 60_000 } })
  @Post("forgot-password")
  @HttpCode(202)
  async forgotPassword(@Body(new ZodPipe(forgotPasswordSchema)) body: ForgotPasswordInput) {
    await this.auth.forgotPassword(body);
    return { status: "accepted" };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(204)
  async resetPassword(
    @Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput,
    @Req() req: Request,
  ) {
    await this.auth.resetPassword(body, this.ctx(req).ip);
  }

  @Public()
  @Post("verify-email")
  @HttpCode(204)
  async verifyEmail(@Body(new ZodPipe(verifyEmailSchema)) body: VerifyEmailInput) {
    await this.auth.verifyEmail(body);
  }

  @Post("resend-verification")
  @HttpCode(202)
  async resendVerification(@CurrentUser() user: RequestUser) {
    await this.auth.resendVerification(user);
    return { status: "accepted" };
  }

  @Public()
  @Post("oauth/google")
  async google(
    @Body(new ZodPipe(googleAuthSchema)) body: GoogleAuthInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.loginWithGoogle(body, this.ctx(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post("oauth/apple")
  async apple(
    @Body(new ZodPipe(appleAuthSchema)) body: AppleAuthInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.loginWithApple(body, this.ctx(req));
    this.setRefreshCookie(res, tokens.refreshToken);
    return tokens;
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

  private ctx(req: Request): { ip?: string; userAgent?: string } {
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim()
        : req.ip;
    return { ip, userAgent: req.headers["user-agent"] };
  }

  private readCookie(req: Request): string | undefined {
    const value = req.cookies?.[REFRESH_COOKIE];
    return typeof value === "string" ? value : undefined;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: PLATFORM.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
      path: "/",
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
  }
}
