import { describe, expect, it } from "vitest";
import { flagsForTest } from "../flags/feature-flags.service";
import { ErrorTrackingService } from "./error-tracking.service";
import type { ErrorTrackingSink } from "./error-tracking.sink";

describe("ErrorTrackingService", () => {
  it("does not call the sink when tracking is off", () => {
    const captured: unknown[] = [];
    const sink: ErrorTrackingSink = {
      captureException(error) {
        captured.push(error);
      },
    };
    const service = new ErrorTrackingService(flagsForTest({ errorTrackingEnabled: false }), sink);
    service.capture(new Error("boom"), { password: "secret", checkoutId: "c1" });
    expect(captured).toHaveLength(0);
  });

  it("sends redacted extras to the sink when tracking is on", () => {
    const extras: Array<Record<string, unknown>> = [];
    const sink: ErrorTrackingSink = {
      captureException(_error, payload) {
        extras.push(payload);
      },
    };
    const service = new ErrorTrackingService(flagsForTest({ errorTrackingEnabled: true }), sink);
    service.capture(new Error("boom"), { password: "secret", checkoutId: "c1" });
    expect(extras).toHaveLength(1);
    expect(extras[0]?.password).toBe("[REDACTED]");
    expect(extras[0]?.checkoutId).toBe("c1");
    expect(extras[0]?.message).toBe("boom");
  });
});
