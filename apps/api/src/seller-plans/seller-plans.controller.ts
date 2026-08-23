import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  LAUNCH_PROMO_CODE,
  SELLER_PLAN_RATES,
  isLaunchPromoActive,
  loadLaunchPromoWindow,
} from "@tcg/config";
import type { FeePreviewView, SellerPlanView } from "@tcg/types";
import { feePreviewSchema, type FeePreviewInput } from "@tcg/validation";
import type { RequestUser } from "../auth/request-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ZodPipe } from "../common/pipes/zod-pipe";
import { MarketplaceFeeService } from "./marketplace-fee.service";
import { SellerPlanService } from "./seller-plan.service";

@Controller("v1/me")
export class SellerPlansController {
  constructor(
    private readonly plans: SellerPlanService,
    private readonly fees: MarketplaceFeeService,
  ) {}

  @Get("seller-plan")
  async myPlan(@CurrentUser() user: RequestUser): Promise<SellerPlanView> {
    const at = new Date();
    const plan = await this.plans.getEffectivePlan(user.id, at);
    const subscription = await this.plans.getActiveSubscription(user.id, at);
    const rates = SELLER_PLAN_RATES[plan];
    const window = loadLaunchPromoWindow();
    const promoActive = isLaunchPromoActive(at, window);
    const quote = this.fees.quoteForPlan(plan, 10_000, at);
    return {
      policyVersion: quote.policyVersion,
      plan,
      monthlyPriceClp: rates.monthlyPriceClp,
      source: subscription?.source ?? null,
      startsAt: subscription?.startsAt.toISOString() ?? null,
      endsAt: subscription?.endsAt?.toISOString() ?? null,
      normalFeeBps: rates.platformFeeBps,
      normalFeeCapClp: rates.platformFeeCapClp,
      promotion: {
        active: promoActive,
        code: promoActive ? LAUNCH_PROMO_CODE : null,
        endsAt: promoActive && window.endsAt ? window.endsAt.toISOString() : null,
        effectiveFeeBps: quote.effectiveFeeBps,
        effectiveFeeCapClp: quote.effectiveFeeCapClp,
      },
      billing: {
        automaticCollection: false,
        message: "Durante la beta el plan se asigna manualmente. No existe cobro recurrente automático.",
      },
    };
  }

  @Post("seller-plan/fee-preview")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async feePreview(
    @CurrentUser() user: RequestUser,
    @Body(new ZodPipe(feePreviewSchema)) body: FeePreviewInput,
  ): Promise<FeePreviewView> {
    const quote = await this.fees.quoteForSeller(user.id, body.amountClp, new Date());
    return {
      plan: quote.planCode,
      promotionCode: quote.promotionCode,
      amountClp: body.amountClp,
      feeClp: quote.platformFeeClp,
      payableBeforeProcessorClp: quote.sellerPayableBeforeProcessorClp,
      normalFeeBps: quote.baseFeeBps,
      effectiveFeeBps: quote.effectiveFeeBps,
    };
  }
}
