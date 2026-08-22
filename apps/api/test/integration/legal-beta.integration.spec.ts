import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES, LEGAL, PLATFORM } from "@tcg/config";
import type { RequestUser } from "../../src/auth/request-user";
import { AuditService } from "../../src/audit/audit.service";
import { AuthService } from "../../src/auth/auth.service";
import { PasswordService } from "../../src/auth/password.service";
import { AdminOpsService } from "../../src/admin/admin-ops.service";
import { FeedbackService } from "../../src/feedback/feedback.service";
import { flagsForTest } from "../../src/flags/feature-flags.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import { RatingsService } from "../../src/ratings/ratings.service";
import { UsersService } from "../../src/users/users.service";
import { cleanupSale, createPendingSale } from "./helpers/market-fixture";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function actor(id: string): RequestUser {
  return {
    id,
    email: "legal@test.local",
    roles: ["USER"],
    sessionId: "it-legal",
    emailVerified: true,
    tokenVersion: 0,
  };
}

describe("Fase 10.7 legal beta (postgres)", () => {
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const users = new UsersService(prisma, audit, new RatingsService(prisma, audit));
  const feedback = new FeedbackService(prisma);
  const ops = new AdminOpsService(prisma, flagsForTest());
  const auth = new AuthService(
    prisma,
    new PasswordService(),
    { signAsync: async () => "access.jwt" } as never,
    { send: async () => undefined } as never,
    audit,
    { verifyGoogle: async () => ({}) } as never,
    { get: () => "http://localhost:3000" } as never,
  );

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores legal versions on register and detects a previous version", async () => {
    const email = `legal-${randomUUID().slice(0, 8)}@test.local`;
    await auth.register(
      {
        email,
        password: "password123",
        displayName: "Legal User",
        acceptTerms: true,
        marketingOptIn: false,
      },
      {},
    );
    const created = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(created.termsVersion).toBe(LEGAL.termsVersion);
    expect(created.privacyVersion).toBe(LEGAL.privacyVersion);
    expect(created.acceptedAt).toBeTruthy();
    expect(created.marketingOptIn).toBe(false);

    const me = await users.getMe(actor(created.id));
    expect(me.legal.stale).toBe(false);

    await prisma.user.update({
      where: { id: created.id },
      data: { termsVersion: "2019-01-01.legacy" },
    });
    const stale = await users.getMe(actor(created.id));
    expect(stale.legal.stale).toBe(true);
    expect(stale.legal.termsVersion).toBe("2019-01-01.legacy");

    const listed = await ops.listUsers({ page: 1, pageSize: 20, q: email });
    expect(listed.items[0]).not.toHaveProperty("termsVersion");
    expect(listed.items[0]).not.toHaveProperty("privacyVersion");
    expect(listed.items[0]).not.toHaveProperty("passwordHash");

    await prisma.session.deleteMany({ where: { userId: created.id } });
    await prisma.emailVerificationToken.deleteMany({ where: { userId: created.id } });
    await prisma.authIdentity.deleteMany({ where: { userId: created.id } });
    await prisma.profile.deleteMany({ where: { userId: created.id } });
    await prisma.userRole.deleteMany({ where: { userId: created.id } });
    await prisma.auditLog.deleteMany({ where: { actorId: created.id } });
    await prisma.user.delete({ where: { id: created.id } });
  });

  it("does not wipe financial records on account deletion request", async () => {
    const sale = await createPendingSale(prisma);
    const payment = await prisma.payment.create({
      data: {
        orderId: sale.orderId,
        provider: "MERCADOPAGO",
        amountClp: 80_000,
        status: "HELD",
        heldAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: sale.buyerId,
        action: "order.paid",
        entityType: "Order",
        entityId: sale.orderId,
      },
    });

    const result = await users.requestDeletion(actor(sale.buyerId));
    expect(result.status).toBe("requested");

    const order = await prisma.order.findUnique({ where: { id: sale.orderId } });
    const keptPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    const logs = await prisma.auditLog.findMany({ where: { entityId: sale.orderId } });
    const buyer = await prisma.user.findUnique({ where: { id: sale.buyerId } });

    expect(order).not.toBeNull();
    expect(keptPayment).not.toBeNull();
    expect(logs.length).toBeGreaterThan(0);
    expect(buyer?.deletedAt).toBeTruthy();
    expect(buyer?.deletionRequestedAt).toBeTruthy();

    await cleanupSale(prisma, sale);
  });

  it("rate-limits beta feedback", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < PLATFORM.feedbackMaxPerWindow; i += 1) {
      await feedback.create(
        { category: "OTHER", message: `Feedback de prueba beta número ${i + 1} xx` },
        { ip },
      );
    }
    await expect(
      feedback.create({ category: "OTHER", message: "Un mensaje extra que no debería pasar xx" }, { ip }),
    ).rejects.toMatchObject({ code: ERROR_CODES.RATE_LIMITED });

    await prisma.feedback.deleteMany({ where: { ip } });
  });
});
