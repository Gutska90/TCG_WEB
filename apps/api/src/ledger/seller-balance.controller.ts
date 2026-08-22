import { Controller, Get } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { RequestUser } from "../auth/request-user";
import { SellerBalanceService } from "./seller-balance.service";

@Controller("v1")
export class SellerBalanceController {
  constructor(private readonly balances: SellerBalanceService) {}

  @Get("me/balance")
  @Roles("USER", "SELLER", "STORE", "MODERATOR", "ADMIN", "SUPER_ADMIN")
  me(@CurrentUser() user: RequestUser) {
    return this.balances.forSeller(user.id);
  }
}
