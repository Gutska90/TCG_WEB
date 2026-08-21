import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { HealthService } from "./health.service";

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get("health")
  liveness() {
    return this.health.liveness();
  }

  @Public()
  @Get("ready")
  async readiness() {
    const body = await this.health.readiness();
    if (body.status === "not_ready") {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
