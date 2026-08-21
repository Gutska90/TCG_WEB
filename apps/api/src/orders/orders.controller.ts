import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  cancelOrderSchema,
  disputeOrderSchema,
  listOrdersQuerySchema,
  shipOrderSchema,
  type CancelOrderInput,
  type DisputeOrderInput,
  type ListOrdersQuery,
  type ShipOrderInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { OrdersService } from "./orders.service";

@Controller("v1/orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query(new ZodPipe(listOrdersQuerySchema)) query: ListOrdersQuery,
  ) {
    return this.orders.list(user, query);
  }

  @Get(":id")
  get(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.orders.get(user, id);
  }

  @Post(":id/prepare")
  prepare(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.orders.prepare(user, id);
  }

  @Post(":id/ship")
  ship(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodPipe(shipOrderSchema)) body: ShipOrderInput,
  ) {
    return this.orders.ship(user, id, body);
  }

  @Post(":id/deliver")
  deliver(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.orders.deliver(user, id);
  }

  @Post(":id/confirm")
  confirm(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.orders.confirm(user, id);
  }

  @Post(":id/cancel")
  cancel(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodPipe(cancelOrderSchema)) body: CancelOrderInput,
  ) {
    return this.orders.cancel(user, id, body);
  }

  @Post(":id/dispute")
  dispute(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodPipe(disputeOrderSchema)) body: DisputeOrderInput,
  ) {
    return this.orders.dispute(user, id, body);
  }
}
