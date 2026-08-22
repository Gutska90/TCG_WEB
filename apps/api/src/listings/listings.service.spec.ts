import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { ListingsService } from "./listings.service";
import type { RequestUser } from "../auth/request-user";
import { flagsForTest } from "../flags/feature-flags.service";

const seller: RequestUser = {
  id: "seller-1",
  email: "s@b.cl",
  roles: ["USER", "SELLER"],
  sessionId: "s1",
  emailVerified: true,
  tokenVersion: 0,
};

describe("ListingsService", () => {
  const prisma = {
    listing: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    collectionItem: { findFirst: vi.fn() },
    sellerSuspension: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(),
  };
  const market = { snapshotVariant: vi.fn(), summarizeForVariant: vi.fn() };
  const audit = { log: vi.fn() };
  const revisions = { record: vi.fn(), snapshot: vi.fn((row: unknown) => row) };
  const service = new ListingsService(
    prisma as never,
    market as never,
    audit as never,
    { summarizeForUsers: vi.fn().mockResolvedValue(new Map()) } as never,
    revisions as never,
    flagsForTest() as never,
    { checkVariant: vi.fn().mockResolvedValue({ hits: 0, drops: 0 }) } as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404s when pausing someone else's listing (no IDOR leak)", async () => {
    prisma.listing.findUnique.mockResolvedValue({
      id: "l1",
      sellerId: "other",
      status: "ACTIVE",
      quantityReserved: 0,
    });
    await expect(service.pause(seller, "l1")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });

  it("rejects unverified sellers", async () => {
    await expect(
      service.create({ ...seller, emailVerified: false }, {
        variantId: "11111111-1111-1111-1111-111111111111",
        condition: "NM",
        quantity: 1,
        priceClp: 1000,
        imageFileIds: ["11111111-1111-4111-8111-111111111111"],
        allowsMeetup: true,
        allowsShipping: true,
      }),
    ).rejects.toMatchObject({
      code: ERROR_CODES.EMAIL_NOT_VERIFIED,
      status: HttpStatus.FORBIDDEN,
    });
  });
});
