import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { assertPayoutTransition, PAYOUT_TRANSITIONS } from "./payout-state";

describe("payout state machine", () => {
  it("allows the documented happy path", () => {
    expect([...PAYOUT_TRANSITIONS.PENDING]).toEqual(["APPROVED", "CANCELLED"]);
    expect([...PAYOUT_TRANSITIONS.APPROVED]).toEqual(["PROCESSING", "CANCELLED"]);
    expect([...PAYOUT_TRANSITIONS.PROCESSING]).toEqual(["PAID", "FAILED"]);
    expect([...PAYOUT_TRANSITIONS.FAILED]).toEqual(["PROCESSING"]);
    expect([...PAYOUT_TRANSITIONS.PAID]).toEqual([]);
    expect([...PAYOUT_TRANSITIONS.CANCELLED]).toEqual([]);
  });

  it("rejects arbitrary and double-paid transitions", () => {
    try {
      assertPayoutTransition("PENDING", "PAID");
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({
        code: ERROR_CODES.PAYOUT_ILLEGAL_TRANSITION,
        status: HttpStatus.CONFLICT,
      });
    }
    try {
      assertPayoutTransition("PAID", "PAID");
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.PAYOUT_ILLEGAL_TRANSITION });
    }
  });
});
