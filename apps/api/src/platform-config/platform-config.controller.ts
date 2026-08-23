import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import {
  CARD_CONDITIONS,
  CARD_FINISHES,
  LEGAL,
  PLATFORM,
  publicFeatureFlags,
  publicSellerPlansConfig,
} from "@tcg/config";
import type { PublicPlatformConfig } from "@tcg/types";
import { Public } from "../common/decorators/public.decorator";
import { FeatureFlagsService } from "../flags/feature-flags.service";

@SkipThrottle()
@Controller("v1")
export class PlatformConfigController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Public()
  @Get("config")
  config(): PublicPlatformConfig {
    return {
      currency: PLATFORM.currency,
      country: PLATFORM.country,
      locale: PLATFORM.locale,
      conditions: [...CARD_CONDITIONS],
      finishes: [...CARD_FINISHES],
      legal: {
        termsVersion: LEGAL.termsVersion,
        privacyVersion: LEGAL.privacyVersion,
        beta: true,
      },
      features: publicFeatureFlags(this.flags.current()),
      sellerPlans: publicSellerPlansConfig(),
    };
  }
}
