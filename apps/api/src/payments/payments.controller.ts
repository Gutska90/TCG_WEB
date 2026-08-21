import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  mercadopagoPreferenceSchema,
  simulatePaymentSchema,
  type MercadopagoPreferenceInput,
  type SimulatePaymentInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { PaymentsService } from "./payments.service";

@Controller("v1")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("payments/mercadopago/preference")
  preference(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(mercadopagoPreferenceSchema)) body: MercadopagoPreferenceInput,
  ) {
    return this.payments.ensurePreference(user.id, body.checkoutId);
  }

  @Post("payments/simulate")
  simulate(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(simulatePaymentSchema)) body: SimulatePaymentInput,
  ) {
    return this.payments.simulate(user.id, body.checkoutId);
  }

  @Public()
  @Post("webhooks/mercadopago")
  @HttpCode(HttpStatus.OK)
  async webhook(@Headers() headers: Record<string, string | string[] | undefined>, @Req() req: Request) {
    await this.payments.handleWebhook(headers, req.body);
    return { received: true };
  }
}
