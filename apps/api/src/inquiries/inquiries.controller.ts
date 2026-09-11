import { Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import {
  createInquirySchema,
  listInquiriesQuerySchema,
  uuidParamSchema,
  type CreateInquiryInput,
  type ListInquiriesQuery,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { CART_COOKIE } from "../cart/cart.controller";
import type { CartActor } from "../cart/cart.service";
import { InquiriesService, type InquiryCreateResult } from "./inquiries.service";

const CART_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

@Controller("v1")
export class InquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @Post("inquiries")
  async create(
    @CurrentUser() user: RequestUser | undefined,
    @Body(new ZodPipe(createInquirySchema)) body: CreateInquiryInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.inquiries.create(this.actor(user, req), body);
    this.applyCookie(res, result);
    return result.view;
  }

  @Get("me/inquiries")
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(listInquiriesQuerySchema)) query: ListInquiriesQuery,
  ) {
    return this.inquiries.list(user.id, query);
  }

  @Public()
  @Get("inquiries/:id")
  get(
    @CurrentUser() user: RequestUser | undefined,
    @Param("id", new ZodPipe(uuidParamSchema)) id: string,
    @Req() req: Request,
  ) {
    return this.inquiries.get(this.actor(user, req), id);
  }

  private actor(user: RequestUser | undefined, req: Request): CartActor {
    const raw = req.cookies?.[CART_COOKIE];
    const guestToken = typeof raw === "string" && raw.length >= 16 ? raw : undefined;
    return { userId: user?.id, guestToken };
  }

  private applyCookie(res: Response, result: InquiryCreateResult): void {
    if (result.clearGuestCookie) {
      res.clearCookie(CART_COOKIE, { path: "/" });
    }
    if (result.issuedGuestToken) {
      res.cookie(CART_COOKIE, result.issuedGuestToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: CART_COOKIE_MAX_AGE_MS,
        path: "/",
      });
    }
  }
}
