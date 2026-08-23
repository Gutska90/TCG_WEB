import { describe, expect, it } from "vitest";
import { createSentrySink } from "./sentry-sink";

describe("createSentrySink", () => {
  it("is a no-op when tracking is off", () => {
    const sink = createSentrySink({ ERROR_TRACKING_ENABLED: "false" });
    expect(() => sink.captureException(new Error("x"), { password: "secret" })).not.toThrow();
  });

  it("is a no-op without DSN", () => {
    const sink = createSentrySink({ ERROR_TRACKING_ENABLED: "true" });
    expect(() => sink.captureException(new Error("x"), {})).not.toThrow();
  });
});
