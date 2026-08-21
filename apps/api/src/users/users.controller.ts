import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import {
  createAddressSchema,
  patchMeSchema,
  sellerOnboardingSchema,
  type CreateAddressInput,
  type PatchMeInput,
  type SellerOnboardingInput,
} from "@tcg/validation";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import type { RequestUser } from "../auth/request-user";
import { UsersService } from "./users.service";

@Controller("v1")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("me")
  @Roles("USER", "SELLER", "STORE", "MODERATOR", "ADMIN", "SUPER_ADMIN")
  me(@CurrentUser() user: RequestUser) {
    return this.users.getMe(user);
  }

  @Patch("me")
  patchMe(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(patchMeSchema)) body: PatchMeInput,
  ) {
    return this.users.updateMe(user, body);
  }

  @Public()
  @Get("users/:id")
  getPublic(@Param("id") id: string) {
    return this.users.getPublic(id);
  }

  @Post("me/seller-onboarding")
  onboardSeller(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(sellerOnboardingSchema)) body: SellerOnboardingInput,
  ) {
    return this.users.onboardSeller(user, body);
  }

  @Get("me/addresses")
  listAddresses(@CurrentUser() user: RequestUser) {
    return this.users.listAddresses(user.id);
  }

  @Post("me/addresses")
  createAddress(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(createAddressSchema)) body: CreateAddressInput,
  ) {
    return this.users.createAddress(user.id, body);
  }

  @Delete("me/addresses/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.users.deleteAddress(user.id, id);
  }
}
