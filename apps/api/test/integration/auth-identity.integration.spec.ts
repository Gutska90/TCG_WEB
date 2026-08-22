import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES, LEGAL } from "@tcg/config";
import type { RequestUser } from "../../src/auth/request-user";
import { AuditService } from "../../src/audit/audit.service";
import { AuthService } from "../../src/auth/auth.service";
import { TEST_JWT_ACCESS_SECRET } from "../../src/auth/jwt-secret";
import { OauthService } from "../../src/auth/oauth.service";
import { signStubOauthToken } from "../../src/auth/oauth-stub";
import { PasswordService } from "../../src/auth/password.service";
import { PrismaService } from "../../src/prisma/prisma.service";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function stubToken(input: {
  provider: "GOOGLE" | "APPLE";
  subject: string;
  email: string | null;
  emailVerified: boolean;
}) {
  return signStubOauthToken(TEST_JWT_ACCESS_SECRET, {
    ...input,
    displayName: input.email ? input.email.split("@")[0] ?? null : null,
  });
}

async function cleanupUser(prisma: PrismaService, userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.authIdentity.deleteMany({ where: { userId } });
  await prisma.profile.deleteMany({ where: { userId } });
  await prisma.userRole.deleteMany({ where: { userId } });
  await prisma.auditLog.deleteMany({ where: { actorId: userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

describe("Fase 11.5 auth identity (postgres)", () => {
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const oauth = new OauthService({ get: () => TEST_JWT_ACCESS_SECRET } as never);
  const auth = new AuthService(
    prisma,
    new PasswordService(),
    { signAsync: async () => "access.jwt" } as never,
    { send: async () => undefined } as never,
    audit,
    oauth,
    { get: () => "http://localhost:3000" } as never,
  );

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    process.env.ENABLE_GOOGLE_AUTH = "true";
    process.env.ENABLE_APPLE_AUTH = "true";
    process.env.AUTH_STUB_OAUTH = "true";
    process.env.NODE_ENV = "test";
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("links Google to an email account and repeats Google login as the same user", async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `link-${suffix}@test.local`;
    const registered = await auth.register(
      {
        email,
        password: "password123",
        displayName: "Link User",
        acceptTerms: true,
      },
      {},
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    const actor: RequestUser = {
      id: user.id,
      email,
      roles: ["USER"],
      sessionId: session.id,
      emailVerified: true,
      tokenVersion: 0,
    };
    await auth.linkGoogle(actor, {
      idToken: stubToken({ provider: "GOOGLE", subject: `g-${suffix}`, email, emailVerified: true }),
    });
    const again = await auth.loginWithGoogle(
      {
        idToken: stubToken({ provider: "GOOGLE", subject: `g-${suffix}`, email, emailVerified: true }),
        acceptTerms: true,
      },
      {},
    );
    expect(registered.tokenType).toBe("Bearer");
    expect(again.tokenType).toBe("Bearer");
    const identities = await prisma.authIdentity.findMany({ where: { userId: user.id } });
    expect(identities.map((row) => row.provider).sort()).toEqual(["EMAIL", "GOOGLE"]);
    await cleanupUser(prisma, user.id);
  });

  it("creates a user on first Google login and reuses it", async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `gfirst-${suffix}@test.local`;
    const subject = `g-first-${suffix}`;
    await auth.loginWithGoogle(
      {
        idToken: stubToken({ provider: "GOOGLE", subject, email, emailVerified: true }),
        acceptTerms: true,
      },
      {},
    );
    const first = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(first.emailVerifiedAt).toBeTruthy();
    expect(first.termsVersion).toBe(LEGAL.termsVersion);
    await auth.loginWithGoogle(
      { idToken: stubToken({ provider: "GOOGLE", subject, email, emailVerified: true }) },
      {},
    );
    const count = await prisma.user.count({ where: { email } });
    expect(count).toBe(1);
    await cleanupUser(prisma, first.id);
  });

  it("creates Apple users by subject and supports private relay", async () => {
    const suffix = randomUUID().slice(0, 8);
    const subject = `apple.${suffix}`;
    const relay = `${suffix}@privaterelay.appleid.com`;
    await auth.loginWithApple(
      {
        identityToken: stubToken({
          provider: "APPLE",
          subject,
          email: relay,
          emailVerified: true,
        }),
        acceptTerms: true,
      },
      {},
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { email: relay } });
    const identity = await prisma.authIdentity.findUniqueOrThrow({
      where: { provider_providerSubject: { provider: "APPLE", providerSubject: subject } },
    });
    expect(identity.userId).toBe(user.id);
    await auth.loginWithApple({ identityToken: stubToken({ provider: "APPLE", subject, email: null, emailVerified: false }) }, {});
    const count = await prisma.user.count({ where: { email: relay } });
    expect(count).toBe(1);
    await cleanupUser(prisma, user.id);
  });

  it("serializes concurrent Google signups for the same email", async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `race-${suffix}@test.local`;
    const results = await Promise.allSettled([
      auth.loginWithGoogle(
        {
          idToken: stubToken({ provider: "GOOGLE", subject: `a-${suffix}`, email, emailVerified: true }),
          acceptTerms: true,
        },
        {},
      ),
      auth.loginWithGoogle(
        {
          idToken: stubToken({ provider: "GOOGLE", subject: `b-${suffix}`, email, emailVerified: true }),
          acceptTerms: true,
        },
        {},
      ),
    ]);
    const ok = results.filter((row) => row.status === "fulfilled");
    const denied = results.filter((row) => row.status === "rejected");
    expect(ok.length).toBe(1);
    expect(denied.length).toBe(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await cleanupUser(prisma, user.id);
  });

  it("revokes a session and rejects its refresh", async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `sess-${suffix}@test.local`;
    const tokens = await auth.register(
      { email, password: "password123", displayName: "Sess", acceptTerms: true },
      {},
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    await auth.revokeSession(
      {
        id: user.id,
        email,
        roles: ["USER"],
        sessionId: session.id,
        emailVerified: false,
        tokenVersion: 0,
      },
      session.id,
    );
    await expect(auth.refresh(tokens.refreshToken, {})).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    });
    await cleanupUser(prisma, user.id);
  });

  it("rejects refresh after the user is banned", async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `ban-${suffix}@test.local`;
    const tokens = await auth.register(
      { email, password: "password123", displayName: "Ban", acceptTerms: true },
      {},
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({ where: { id: user.id }, data: { isBanned: true, bannedAt: new Date() } });
    await expect(auth.refresh(tokens.refreshToken, {})).rejects.toMatchObject({
      code: ERROR_CODES.ACCOUNT_BANNED,
    });
    await auth.invalidateAccess(user.id, "user.banned");
    await expect(auth.login({ email, password: "password123" }, {})).rejects.toMatchObject({
      code: ERROR_CODES.ACCOUNT_BANNED,
    });
    await cleanupUser(prisma, user.id);
  });

  it("rejects refresh after account deactivation", async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `del-${suffix}@test.local`;
    const tokens = await auth.register(
      { email, password: "password123", displayName: "Del", acceptTerms: true },
      {},
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date(), deletionRequestedAt: new Date(), tokenVersion: { increment: 1 } },
    });
    await prisma.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await expect(auth.refresh(tokens.refreshToken, {})).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    });
    await prisma.user.update({ where: { id: user.id }, data: { deletedAt: null } });
    await cleanupUser(prisma, user.id);
  });

  it("persists legal consent on OAuth registration", async () => {
    const suffix = randomUUID().slice(0, 8);
    const email = `consent-${suffix}@test.local`;
    await expect(
      auth.loginWithGoogle(
        { idToken: stubToken({ provider: "GOOGLE", subject: `c-${suffix}`, email, emailVerified: true }) },
        {},
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.LEGAL_CONSENT_REQUIRED });
    await auth.loginWithGoogle(
      {
        idToken: stubToken({ provider: "GOOGLE", subject: `c-${suffix}`, email, emailVerified: true }),
        acceptTerms: true,
        marketingOptIn: true,
      },
      {},
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.termsVersion).toBe(LEGAL.termsVersion);
    expect(user.privacyVersion).toBe(LEGAL.privacyVersion);
    expect(user.acceptedAt).toBeTruthy();
    expect(user.marketingOptIn).toBe(true);
    await cleanupUser(prisma, user.id);
  });
});
