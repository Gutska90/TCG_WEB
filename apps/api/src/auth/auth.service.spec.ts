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
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    authIdentity: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
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

  return { service, prisma, passwords, jwt, mail, audit, oauth };
}

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects duplicate email on register", async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({ id: "u1" });
    await expect(
      service.register(
        {
          email: "a@b.cl",
          password: "password123",
          displayName: "Ana",
          acceptTerms: true,
          marketingOptIn: false,
        },
        {},
      ),
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

  it("stores current legal versions and separate marketing opt-in on register", async () => {
    const { service, prisma, passwords, mail } = createService();
    prisma.user.findUnique.mockResolvedValue(null);
    passwords.hash.mockResolvedValue("hash");
    const created = {
      id: "u1",
      email: "ana@b.cl",
      emailVerifiedAt: null,
      tokenVersion: 0,
      isBanned: false,
      roles: [{ role: "USER" }],
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        user: {
          create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
            expect(data.termsVersion).toBeDefined();
            expect(data.privacyVersion).toBeDefined();
            expect(data.marketingOptIn).toBe(true);
            expect(data.acceptedAt).toBeInstanceOf(Date);
            return created;
          }),
        },
        emailVerificationToken: { create: vi.fn() },
      };
      return fn(tx);
    });
    prisma.session.create.mockResolvedValue({ id: "s1" });

    const tokens = await service.register(
      {
        email: "ana@b.cl",
        password: "password123",
        displayName: "Ana",
        acceptTerms: true,
        marketingOptIn: true,
      },
      {},
    );
    expect(tokens.tokenType).toBe("Bearer");
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("beta") }),
    );
  });

  const actor = {
    id: "u1",
    email: "ana@b.cl",
    roles: ["USER"] as const,
    sessionId: "s-current",
    emailVerified: true,
    tokenVersion: 0,
  };

  const googleProfile = {
    provider: "GOOGLE" as const,
    subject: "g-sub",
    email: "ana@b.cl",
    emailVerified: true,
    displayName: "Ana",
  };

  it("rejects OAuth signup without legal consent", async () => {
    const { service, prisma, oauth } = createService();
    oauth.verifyGoogle.mockResolvedValue(googleProfile);
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.loginWithGoogle({ idToken: "token-value" }, {})).rejects.toMatchObject({
      code: ERROR_CODES.LEGAL_CONSENT_REQUIRED,
    });
  });

  it("rejects Google signup when the provider does not certify the email", async () => {
    const { service, prisma, oauth } = createService();
    oauth.verifyGoogle.mockResolvedValue({ ...googleProfile, emailVerified: false });
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.loginWithGoogle({ idToken: "token-value", acceptTerms: true }, {})).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it("marks email verified when Google certifies it on signup", async () => {
    const { service, prisma, oauth } = createService();
    oauth.verifyGoogle.mockResolvedValue(googleProfile);
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }: { data: { emailVerifiedAt: Date | null } }) => {
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
      return { id: "u1", email: "ana@b.cl", emailVerifiedAt: data.emailVerifiedAt, tokenVersion: 0, isBanned: false, roles: [{ role: "USER" }] };
    });
    prisma.session.create.mockResolvedValue({ id: "s1" });
    const tokens = await service.loginWithGoogle({ idToken: "token-value", acceptTerms: true }, {});
    expect(tokens.accessToken).toBe("access.jwt");
  });

  it("does not auto-link Google onto an existing email account", async () => {
    const { service, prisma, oauth } = createService();
    oauth.verifyGoogle.mockResolvedValue(googleProfile);
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue({
      id: "u-existing",
      email: "ana@b.cl",
      emailVerifiedAt: new Date(),
      deletedAt: null,
      identities: [],
    });
    await expect(service.loginWithGoogle({ idToken: "token-value", acceptTerms: true }, {})).rejects.toMatchObject({
      code: ERROR_CODES.ACCOUNT_CONFLICT,
    });
    expect(prisma.authIdentity.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate provider subject on link", async () => {
    const { service, prisma, oauth } = createService();
    oauth.verifyGoogle.mockResolvedValue(googleProfile);
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      email: "ana@b.cl",
      emailVerifiedAt: new Date(),
      isBanned: false,
      deletedAt: null,
      identities: [],
    });
    prisma.authIdentity.findUnique.mockResolvedValue({ id: "other", userId: "u2" });
    await expect(service.linkGoogle(actor, { idToken: "token-value" })).rejects.toMatchObject({
      code: ERROR_CODES.ACCOUNT_CONFLICT,
    });
  });

  it("links Google when emails match and are verified", async () => {
    const { service, prisma, oauth } = createService();
    oauth.verifyGoogle.mockResolvedValue(googleProfile);
    prisma.user.findFirst
      .mockResolvedValueOnce({
        id: "u1",
        email: "ana@b.cl",
        emailVerifiedAt: new Date(),
        isBanned: false,
        deletedAt: null,
        identities: [],
      })
      .mockResolvedValueOnce({
        id: "u1",
        passwordHash: "hash",
        identities: [{ provider: "EMAIL", createdAt: new Date() }, { provider: "GOOGLE", createdAt: new Date() }],
      });
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.authIdentity.create.mockResolvedValue({ id: "i1" });
    const methods = await service.linkGoogle(actor, { idToken: "token-value" });
    expect(methods.identities.some((row) => row.provider === "GOOGLE")).toBe(true);
  });

  it("rejects unsafe Google link when emails differ", async () => {
    const { service, prisma, oauth } = createService();
    oauth.verifyGoogle.mockResolvedValue({ ...googleProfile, email: "other@b.cl" });
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      email: "ana@b.cl",
      emailVerifiedAt: new Date(),
      isBanned: false,
      deletedAt: null,
      identities: [],
    });
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    await expect(service.linkGoogle(actor, { idToken: "token-value" })).rejects.toMatchObject({
      code: ERROR_CODES.ACCOUNT_CONFLICT,
    });
  });

  it("rejects unlinking the last login method", async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      passwordHash: null,
      identities: [{ id: "i-g", provider: "GOOGLE", providerSubject: "g-sub" }],
    });
    await expect(service.unlinkIdentity(actor, "GOOGLE")).rejects.toMatchObject({
      code: ERROR_CODES.LAST_AUTH_METHOD,
    });
  });

  it("adds a password to an OAuth user", async () => {
    const { service, prisma, passwords } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      email: "ana@b.cl",
      passwordHash: null,
      deletedAt: null,
    });
    passwords.hash.mockResolvedValue("new-hash");
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
    await service.setPassword(actor, { password: "password123" });
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.authIdentity.upsert).toHaveBeenCalled();
  });

  it("rejects banned login", async () => {
    const { service, prisma, passwords } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      passwordHash: "hash",
      isBanned: true,
      deletedAt: null,
      roles: [{ role: "USER" }],
    });
    passwords.verify.mockResolvedValue(true);
    await expect(service.login({ email: "ana@b.cl", password: "password123" }, {})).rejects.toMatchObject({
      code: ERROR_CODES.ACCOUNT_BANNED,
    });
  });

  it("rejects banned refresh", async () => {
    const { service, prisma } = createService();
    prisma.session.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
    });
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      isBanned: true,
      deletedAt: null,
      roles: [{ role: "USER" }],
    });
    await expect(service.refresh("refresh-token-value", {})).rejects.toMatchObject({
      code: ERROR_CODES.ACCOUNT_BANNED,
    });
  });

  it("rotates refresh by revoking the previous session", async () => {
    const { service, prisma } = createService();
    prisma.session.findUnique.mockResolvedValue({
      id: "s-old",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
    });
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      isBanned: false,
      deletedAt: null,
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
      roles: [{ role: "USER" }],
    });
    prisma.session.update.mockResolvedValue({});
    prisma.session.create.mockResolvedValue({ id: "s-new" });
    await service.refresh("refresh-token-value", {});
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "s-old" },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.session.create).toHaveBeenCalled();
  });

  it("revokes a specific session", async () => {
    const { service, prisma } = createService();
    prisma.session.findFirst.mockResolvedValue({ id: "s-other", userId: "u1" });
    await service.revokeSession(actor, "s-other");
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "s-other" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("revokes other sessions and keeps the current one", async () => {
    const { service, prisma } = createService();
    await service.revokeAllSessions(actor);
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", revokedAt: null, NOT: { id: "s-current" } },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("does not put token values in session list", async () => {
    const { service, prisma } = createService();
    prisma.session.findMany.mockResolvedValue([
      {
        id: "s-current",
        userAgent: "Mozilla",
        ip: "127.0.0.1",
        createdAt: new Date(),
        expiresAt: new Date(),
        refreshTokenHash: "should-not-leak",
      },
    ]);
    const rows = await service.listSessions(actor);
    expect(JSON.stringify(rows)).not.toContain("should-not-leak");
    expect(rows[0]).not.toHaveProperty("refreshTokenHash");
  });
});
