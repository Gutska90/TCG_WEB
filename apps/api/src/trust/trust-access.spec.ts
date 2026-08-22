import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { assertDisputeTransition } from "./trust-access";
import { sanitizePlainText } from "./sanitize";
import { AppError } from "../common/errors/app-error";

describe("dispute state machine", () => {
  it("allows OPEN to UNDER_REVIEW and resolve", () => {
    expect(() => assertDisputeTransition("OPEN", "UNDER_REVIEW")).not.toThrow();
    expect(() => assertDisputeTransition("UNDER_REVIEW", "RESOLVED_BUYER")).not.toThrow();
  });

  it("rejects transitions out of a terminal status", () => {
    expect(() => assertDisputeTransition("RESOLVED_BUYER", "OPEN")).toThrow(AppError);
    try {
      assertDisputeTransition("CANCELLED", "UNDER_REVIEW");
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.DISPUTE_ILLEGAL_TRANSITION });
    }
  });
});

describe("sanitizePlainText", () => {
  it("strips tags and truncates", () => {
    expect(sanitizePlainText("<script>x</script>hola", 20)).toBe("x hola");
  });
});
