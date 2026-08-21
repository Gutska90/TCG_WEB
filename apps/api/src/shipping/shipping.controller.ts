import { Controller, Get, Param, Query } from "@nestjs/common";
import { shippingQuoteQuerySchema, type ShippingQuoteQuery } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { ShippingService } from "./shipping.service";

@Controller("v1")
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get("shipping/quote")
  quote(@Query(new ZodPipe(shippingQuoteQuerySchema)) query: ShippingQuoteQuery) {
    return this.shipping.quote(query);
  }

  @Get("shipments/:id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.shipping.getForParticipant(user, id);
  }
}
