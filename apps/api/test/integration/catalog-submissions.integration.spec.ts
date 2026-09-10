import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { CatalogSubmissionsService } from "../../src/catalog/submissions/catalog-submissions.service";
import { AuditService } from "../../src/audit/audit.service";
import { PrismaService } from "../../src/prisma/prisma.service";
import type { RequestUser } from "../../src/auth/request-user";
import { RolesGuard } from "../../src/common/guards/roles.guard";
import { Reflector } from "@nestjs/core";
import { ADMIN_OPS_ROLES } from "@tcg/config";
import type { ExecutionContext } from "@nestjs/common";

loadEnv({ path: resolve(__dirname, "../../../../.env") });

function actor(id: string, roles: RequestUser["roles"], email = "user@test.local"): RequestUser {
  return { id, email, roles, sessionId: "it-sub", emailVerified: true, tokenVersion: 0 };
}

function opsContext(user: RequestUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("CatalogSubmission (postgres)", () => {
  const prisma = new PrismaService();
  const audit = new AuditService(prisma);
  const service = new CatalogSubmissionsService(prisma, audit);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for integration tests");
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lets a user create a submission, hides others, and admin approval creates Card+Variant once", async () => {
    const suffix = randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        email: `sub-user-${suffix}@test.local`,
        displayName: "Submitter",
        slug: `sub-user-${suffix}`,
        emailVerifiedAt: new Date(),
        roles: { create: [{ role: "USER" }] },
      },
    });
    const other = await prisma.user.create({
      data: {
        email: `sub-other-${suffix}@test.local`,
        displayName: "Other",
        slug: `sub-other-${suffix}`,
        roles: { create: [{ role: "USER" }] },
      },
    });
    const adminUser = await prisma.user.create({
      data: {
        email: `sub-admin-${suffix}@test.local`,
        displayName: "Admin",
        slug: `sub-admin-${suffix}`,
        roles: { create: [{ role: "ADMIN" }] },
      },
    });
    const game = await prisma.tcgGame.create({
      data: { slug: `it-sub-${suffix}`, name: "IT Sub", publisher: "IT", sortOrder: 90 },
    });
    const set = await prisma.tcgSet.create({
      data: { gameId: game.id, code: `S${suffix.slice(0, 4)}`, slug: `it-sub-set-${suffix}`, name: "IT Set" },
    });
    try {
      const created = await service.create(actor(user.id, ["USER"]), {
        gameId: game.id,
        setId: set.id,
        name: "Carta Propuesta",
        number: "077",
        rarity: "Rare",
        attributes: { cardType: "ALIADO" },
      });
      expect(created.status).toBe("PENDING");

      const mine = await service.listMine(user.id, 1, 20);
      expect(mine.items.some((row) => row.id === created.id)).toBe(true);
      await expect(service.getMine(other.id, created.id)).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND });

      const reflector = {
        getAllAndOverride: (key: string) => (key === "roles" ? [...ADMIN_OPS_ROLES] : false),
      } as unknown as Reflector;
      const guard = new RolesGuard(reflector);
      expect(() => guard.canActivate(opsContext(actor(user.id, ["USER"])))).toThrow();
      expect(() => guard.canActivate(opsContext(actor(user.id, ["SELLER"])))).toThrow();
      expect(guard.canActivate(opsContext(actor(adminUser.id, ["ADMIN"])))).toBe(true);
      expect(guard.canActivate(opsContext(actor(adminUser.id, ["SUPER_ADMIN"])))).toBe(true);

      const approved = await service.approve(actor(adminUser.id, ["ADMIN"]), created.id, {});
      expect(approved.status).toBe("APPROVED");
      expect(approved.approvedCard?.name).toBe("Carta Propuesta");
      const card = await prisma.card.findUniqueOrThrow({
        where: { id: approved.approvedCardId! },
        include: { variants: true },
      });
      expect(card.variants.some((row) => row.isDefault)).toBe(true);
      const logs = await prisma.auditLog.findMany({
        where: { entityId: created.id, action: { startsWith: "catalog_submission." } },
      });
      expect(logs.some((row) => row.action === "catalog_submission.created")).toBe(true);
      expect(logs.some((row) => row.action === "catalog_submission.approved")).toBe(true);

      await expect(service.approve(actor(adminUser.id, ["ADMIN"]), created.id, {})).rejects.toMatchObject({
        code: ERROR_CODES.CATALOG_SUBMISSION_NOT_REVIEWABLE,
      });
    } finally {
      await prisma.catalogSubmission.deleteMany({ where: { gameId: game.id } });
      await prisma.cardVariant.deleteMany({ where: { card: { setId: set.id } } });
      await prisma.card.deleteMany({ where: { setId: set.id } });
      await prisma.tcgSet.delete({ where: { id: set.id } });
      await prisma.tcgGame.delete({ where: { id: game.id } });
      await prisma.userRole.deleteMany({ where: { userId: { in: [user.id, other.id, adminUser.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, other.id, adminUser.id] } } });
    }
  });

  it("supports reject, duplicate and needs-info transitions", async () => {
    const suffix = randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        email: `sub-rev-${suffix}@test.local`,
        displayName: "Submitter",
        slug: `sub-rev-${suffix}`,
        roles: { create: [{ role: "USER" }] },
      },
    });
    const adminUser = await prisma.user.create({
      data: {
        email: `sub-rev-admin-${suffix}@test.local`,
        displayName: "Admin",
        slug: `sub-rev-admin-${suffix}`,
        roles: { create: [{ role: "ADMIN" }] },
      },
    });
    const game = await prisma.tcgGame.create({
      data: { slug: `it-rev-${suffix}`, name: "IT Rev", publisher: "IT", sortOrder: 91 },
    });
    const set = await prisma.tcgSet.create({
      data: { gameId: game.id, code: `R${suffix.slice(0, 4)}`, slug: `it-rev-set-${suffix}`, name: "IT Set" },
    });
    try {
      const a = await service.create(actor(user.id, ["USER"]), { gameId: game.id, setId: set.id, name: "A", attributes: {} });
      const b = await service.create(actor(user.id, ["USER"]), { gameId: game.id, setId: set.id, name: "B", attributes: {} });
      const c = await service.create(actor(user.id, ["USER"]), { gameId: game.id, setId: set.id, name: "C", attributes: {} });
      await service.reject(actor(adminUser.id, ["ADMIN"]), a.id, { reviewNotes: "No encaja en el catálogo" });
      await service.markDuplicate(actor(adminUser.id, ["ADMIN"]), b.id, { reviewNotes: "Ya existe" });
      await service.needsInfo(actor(adminUser.id, ["ADMIN"]), c.id, { reviewNotes: "Falta el número" });
      expect((await service.getAdmin(a.id)).status).toBe("REJECTED");
      expect((await service.getAdmin(b.id)).status).toBe("DUPLICATE");
      expect((await service.getAdmin(c.id)).status).toBe("NEEDS_INFO");
    } finally {
      await prisma.catalogSubmission.deleteMany({ where: { gameId: game.id } });
      await prisma.tcgSet.delete({ where: { id: set.id } });
      await prisma.tcgGame.delete({ where: { id: game.id } });
      await prisma.userRole.deleteMany({ where: { userId: { in: [user.id, adminUser.id] } } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, adminUser.id] } } });
    }
  });
});
