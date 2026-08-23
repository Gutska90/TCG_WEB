import { Injectable } from "@nestjs/common";
import {
  LAUNCH_PROMO_CODE,
  loadLaunchPromoWindow,
  quoteMarketplaceFee,
  type MarketplaceFeeQuote,
  type SellerPlan,
} from "@tcg/config";
import { MetricsService } from "../observability/metrics.service";
import { SellerPlanService, type DbClient } from "./seller-plan.service";

@Injectable()
export class MarketplaceFeeService {
  constructor(
    private readonly plans: SellerPlanService,
    private readonly metrics: MetricsService,
  ) {}

  async quoteForSeller(
    sellerId: string,
    orderSubtotalClp: number,
    at: Date,
    client?: DbClient,
  ): Promise<MarketplaceFeeQuote> {
    const plan = await this.plans.getEffectivePlan(sellerId, at, client);
    return quoteMarketplaceFee({
      plan,
      orderSubtotalClp,
      at,
      promoWindow: loadLaunchPromoWindow(),
    });
  }

  /** Única entrada de comisión al crear una Order. */
  calculate(
    input: { sellerId: string; orderSubtotalClp: number; at: Date },
    client?: DbClient,
  ): Promise<MarketplaceFeeQuote> {
    return this.quoteForSeller(input.sellerId, input.orderSubtotalClp, input.at, client);
  }

  quoteForPlan(plan: SellerPlan, orderSubtotalClp: number, at = new Date()): MarketplaceFeeQuote {
    return quoteMarketplaceFee({
      plan,
      orderSubtotalClp,
      at,
      promoWindow: loadLaunchPromoWindow(),
    });
  }

  recordOrderQuote(quote: MarketplaceFeeQuote): void {
    this.metrics.add("gmv_clp_total", quote.grossAmountClp);
    this.metrics.add("platform_revenue_clp_total", quote.platformFeeClp);
    this.metrics.add(`gmv_clp_plan_${quote.planCode}`, quote.grossAmountClp);
    this.metrics.add(`platform_revenue_clp_plan_${quote.planCode}`, quote.platformFeeClp);
    this.metrics.add("orders_by_plan_total", 1);
    this.metrics.add(`orders_plan_${quote.planCode}`, 1);
    if (quote.promotionCode) {
      this.metrics.add("promo_gmv_clp", quote.grossAmountClp);
      const full = quoteMarketplaceFee({
        plan: quote.planCode,
        orderSubtotalClp: quote.grossAmountClp,
        promoWindow: { enabled: false, code: LAUNCH_PROMO_CODE, startsAt: null, endsAt: null },
      });
      this.metrics.add("promo_discount_clp", full.platformFeeClp - quote.platformFeeClp);
    }
  }
}
