import { ExecutionContext, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../errors/app-error";
import { RolesGuard } from "./roles.guard";
import type { RequestUser } from "../../auth/request-user";

function contextWith(user: RequestUser | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext; // test double: only getHandler/getClass/switchToHttp are used
}

describe("RolesGuard", () => {
  it("allows when no roles metadata is set", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
  });

  it("rejects a user missing the required role", () => {
    const reflector = {
      getAllAndOverride: vi.fn((key: string) => {
        if (key === "isPublic") return false;
        if (key === "roles") return ["ADMIN"];
        return undefined;
      }),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const user: RequestUser = {
      id: "u1",
      email: "a@b.cl",
      roles: ["USER"],
      sessionId: "s1",
      emailVerified: true,
      tokenVersion: 0,
    };
    expect(() => guard.canActivate(contextWith(user))).toThrow(AppError);
    try {
      guard.canActivate(contextWith(user));
    } catch (error) {
      expect(error).toMatchObject({ code: ERROR_CODES.FORBIDDEN, status: HttpStatus.FORBIDDEN });
    }
  });
});
