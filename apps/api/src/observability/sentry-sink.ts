import * as Sentry from "@sentry/node";
import { redactRecord, safeErrorMessage } from "./redact";
import { noopErrorTrackingSink, type ErrorTrackingSink } from "./error-tracking.sink";

let initialized = false;

function scrubEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      const headers = { ...event.request.headers };
      for (const key of Object.keys(headers)) {
        if (/authorization|cookie|token|secret|password/i.test(key)) {
          headers[key] = "[REDACTED]";
        }
      }
      event.request.headers = headers;
    }
  }
  if (event.extra) {
    event.extra = redactRecord(event.extra as Record<string, unknown>);
  }
  if (event.user) {
    event.user = { id: event.user.id };
  }
  return event;
}

export function createSentrySink(env: NodeJS.Dict<string> = process.env): ErrorTrackingSink {
  const enabled = env.ERROR_TRACKING_ENABLED === "1" || env.ERROR_TRACKING_ENABLED?.toLowerCase() === "true";
  const dsn = env.SENTRY_DSN?.trim();
  if (!enabled || !dsn) return noopErrorTrackingSink;
  if (!initialized) {
    Sentry.init({
      dsn,
      environment: env.SENTRY_ENVIRONMENT?.trim() || env.APP_ENV?.trim() || env.NODE_ENV || "development",
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        return scrubEvent(event);
      },
    });
    initialized = true;
  }
  return {
    captureException(error: unknown, extras: Record<string, unknown>) {
      const redacted = redactRecord(extras);
      Sentry.withScope((scope) => {
        scope.setExtras(redacted);
        const requestId = redacted.requestId;
        if (typeof requestId === "string" && requestId) {
          scope.setTag("requestId", requestId);
        }
        const jobName = redacted.jobName;
        if (typeof jobName === "string" && jobName) {
          scope.setTag("jobName", jobName);
        }
        Sentry.captureException(error instanceof Error ? error : new Error(safeErrorMessage(error)));
      });
    },
  };
}
