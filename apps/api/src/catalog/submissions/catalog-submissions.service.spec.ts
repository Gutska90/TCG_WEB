import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { CatalogSubmissionsService } from "./catalog-submissions.service";
import type { RequestUser } from "../../auth/request-user";

const submissionId = "11111111-1111-4111-8111-111111111111";
const setId = "22222222-2222-4222-8222-222222222222";
const admin: RequestUser = {
  id: "admin-1",
  email: "admin@test.local",
  roles: ["ADMIN"],
  sessionId: "s",
  emailVerified: true,
  tokenVersion: 0,
};

describe("CatalogSubmissionsService unique conflicts", () => {
  it("maps concurrent Card.create P2002 to 409 CONFLICT", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "test",
    });
    const prisma = {
      $transaction: async (fn: (tx: never) => Promise<unknown>) =>
        fn({
          $queryRaw: async () => [{ id: submissionId, status: "PENDING" }],
          catalogSubmission: {
            findUniqueOrThrow: async () => ({
              id: submissionId,
              gameId: "g1",
              setId,
              proposedSetName: null,
              name: "Brunhild",
              number: "1",
              rarity: "Ultra Real",
              supertype: "Aliado",
              attributes: {},
              sourceUrl: null,
              imageUrl: null,
              reviewNotes: null,
            }),
          },
          tcgSet: { findFirst: async () => ({ id: setId, gameId: "g1" }) },
          card: {
            findUnique: async () => null,
            findMany: async () => [],
            create: async () => {
              throw p2002;
            },
          },
        } as never),
    };
    const service = new CatalogSubmissionsService(prisma as never, { log: vi.fn() } as never);
    await expect(service.approve(admin, submissionId, { setId, createNewSet: false })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      status: HttpStatus.CONFLICT,
    });
  });
});
