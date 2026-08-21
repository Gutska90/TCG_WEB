import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import {
  CARD_CONDITIONS,
  CARD_FINISHES,
  PLATFORM,
} from "@tcg/config";
import type { PublicPlatformConfig } from "@tcg/types";
import { Public } from "../common/decorators/public.decorator";

@SkipThrottle()
@Controller("v1")
export class PlatformConfigController {
  @Public()
  @Get("config")
  config(): PublicPlatformConfig {
    return {
      currency: PLATFORM.currency,
      country: PLATFORM.country,
      locale: PLATFORM.locale,
      conditions: [...CARD_CONDITIONS],
      finishes: [...CARD_FINISHES],
    };
  }
}
