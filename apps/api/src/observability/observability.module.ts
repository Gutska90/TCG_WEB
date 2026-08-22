import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ErrorTrackingService } from "./error-tracking.service";
import { JsonLogger } from "./json-logger";
import { MetricsService } from "./metrics.service";
import { RequestContextMiddleware } from "./request-context.middleware";

@Global()
@Module({
  providers: [MetricsService, ErrorTrackingService, JsonLogger, RequestContextMiddleware],
  exports: [MetricsService, ErrorTrackingService, JsonLogger],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
