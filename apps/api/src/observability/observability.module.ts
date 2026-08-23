import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ErrorTrackingService } from "./error-tracking.service";
import { ERROR_TRACKING_SINK } from "./error-tracking.tokens";
import { JsonLogger } from "./json-logger";
import { MetricsService } from "./metrics.service";
import { RequestContextMiddleware } from "./request-context.middleware";
import { createSentrySink } from "./sentry-sink";

@Global()
@Module({
  providers: [
    MetricsService,
    { provide: ERROR_TRACKING_SINK, useFactory: () => createSentrySink() },
    ErrorTrackingService,
    JsonLogger,
    RequestContextMiddleware,
  ],
  exports: [MetricsService, ErrorTrackingService, JsonLogger],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
