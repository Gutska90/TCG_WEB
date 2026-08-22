import { describe, expect, it } from "vitest";
import { ApiError, userFacingError } from "./errors";

describe("userFacingError", () => {
  it("maps HTTP statuses to Spanish copy", () => {
    expect(userFacingError(new ApiError(401, "UNAUTHORIZED", "x"))).toMatch(/sesión/);
    expect(userFacingError(new ApiError(403, "ACCOUNT_BANNED", "x"))).toMatch(/suspendida/);
    expect(userFacingError(new ApiError(403, "FORBIDDEN", "No"))).toBe("No");
    expect(userFacingError(new ApiError(404, "NOT_FOUND", "x"))).toMatch(/encontramos/);
    expect(userFacingError(new ApiError(409, "CONFLICT", "Stock"))).toBe("Stock");
    expect(userFacingError(new ApiError(429, "RATE_LIMITED", "x"))).toMatch(/Demasiados/);
    expect(userFacingError(new ApiError(500, "INTERNAL", "stack"))).toMatch(/problema/);
  });

  it("maps network failures", () => {
    expect(userFacingError(new TypeError("Failed to fetch"))).toMatch(/conexión/);
  });
});
