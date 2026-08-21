import { Body, Controller, Delete, Get, Param, Put, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { listingIdParamSchema, putCartItemSchema, type PutCartItemInput } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { CartService, type CartActor, type CartResult } from "./cart.service";

export const CART_COOKIE = "cart";
const CART_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

@Controller("v1/cart")
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Public()
  @Get()
  async get(
    @CurrentUser() user: RequestUser | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.carts.get(this.actor(user, req));
    this.applyCookie(res, result);
    return result.view;
  }

  @Public()
  @Put("items")
  async putItem(
    @CurrentUser() user: RequestUser | undefined,
    @Body(new ZodPipe(putCartItemSchema)) body: PutCartItemInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.carts.putItem(this.actor(user, req), body);
    this.applyCookie(res, result);
    return result.view;
  }

  @Public()
  @Delete("items/:listingId")
  async removeItem(
    @CurrentUser() user: RequestUser | undefined,
    @Param("listingId", new ZodPipe(listingIdParamSchema)) listingId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.carts.removeItem(this.actor(user, req), listingId);
    this.applyCookie(res, result);
    return result.view;
  }

  private actor(user: RequestUser | undefined, req: Request): CartActor {
    const raw = req.cookies?.[CART_COOKIE];
    const guestToken = typeof raw === "string" && raw.length >= 16 ? raw : undefined;
    return { userId: user?.id, guestToken };
  }

  private applyCookie(res: Response, result: CartResult): void {
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
