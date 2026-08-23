import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { FeatureFlagsService } from "../flags/feature-flags.service";
import { ERROR_TRACKING_SINK } from "./error-tracking.tokens";
import type { ErrorTrackingSink } from "./error-tracking.sink";
import { redactRecord, safeErrorMessage } from "./redact";
import { currentRequestId } from "./request-context";

@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);

  constructor(
    private readonly flags: FeatureFlagsService,
    @Optional() @Inject(ERROR_TRACKING_SINK) private readonly sink?: ErrorTrackingSink,
  ) {}

  capture(error: unknown, extras?: Record<string, unknown>): void {
    const payload = redactRecord({
      event: "error.captured",
      requestId: currentRequestId() ?? null,
      message: safeErrorMessage(error),
      ...extras,
    });
    this.logger.error(JSON.stringify(payload));
    if (!this.flags.current().errorTrackingEnabled) return;
    this.sink?.captureException(error, payload);
  }
}
