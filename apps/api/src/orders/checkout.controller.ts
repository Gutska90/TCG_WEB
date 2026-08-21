import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { checkoutSchema, type CheckoutInput } from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { OrdersService } from "./orders.service";
import { PaymentsService } from "../payments/payments.service";

@Controller("v1")
export class CheckoutController {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  @Post("checkout")
  async checkout(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(checkoutSchema)) body: CheckoutInput,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    const created = await this.orders.createCheckout(user, body, idempotencyKey, {
      initPoint: null,
      sandboxInitPoint: null,
      mock: this.payments.mockEnabled(),
    });
    const mp = await this.payments.createPreference(created.id, user.id);
    return this.orders.getCheckout(user, created.id, mp);
  }

  @Get("checkouts/:id")
  async get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    const mp = await this.payments.createPreference(id, user.id).catch(async () =>
      this.payments.decorate(id),
    );
    return this.orders.getCheckout(user, id, mp);
  }
}
