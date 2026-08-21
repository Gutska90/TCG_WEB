import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { AuthService } from "./auth.service";
import type { PasswordService } from "./password.service";

function createService() {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    authIdentity: { findUnique: vi.fn(), create: vi.fn() },
    passwordResetToken: { create: vi.fn(), findUnique: vi.fn() },
    emailVerificationToken: { create: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  };
  const passwords = {
    hash: vi.fn(),
    verify: vi.fn(),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue("access.jwt") };
  const mail = { send: vi.fn() };
  const audit = { log: vi.fn() };
  const oauth = { verifyGoogle: vi.fn(), verifyApple: vi.fn() };
  const config = { get: vi.fn().mockReturnValue("http://localhost:3000") };

  const service = new AuthService(
    prisma as never,
    passwords as unknown as PasswordService,
    jwt as never,
    mail as never,
    audit as never,
    oauth as never,
    config as never,
  );

  return { service, prisma, passwords, jwt, mail, audit };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects duplicate email on register", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "u1" });
    await expect(
      service.register({ email: "a@b.cl", password: "password123", displayName: "Ana" }, {}),
    ).rejects.toMatchObject({ code: ERROR_CODES.EMAIL_TAKEN, status: HttpStatus.CONFLICT });
  });

  it("rejects unknown login with generic credentials error", async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.login({ email: "a@b.cl", password: "x" }, {})).rejects.toBeInstanceOf(AppError);
    await expect(service.login({ email: "a@b.cl", password: "x" }, {})).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it("revokes every session when a revoked refresh token is reused", async () => {
    const { service, prisma, audit } = createService();
    prisma.session.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 10000),
    });
    prisma.session.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.refresh("old-refresh-token-value", {})).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    });
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.refresh_reuse" }));
  });
});
