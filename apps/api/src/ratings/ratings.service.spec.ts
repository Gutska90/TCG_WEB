import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { RatingsService } from "./ratings.service";
import type { RequestUser } from "../auth/request-user";

const buyer: RequestUser = {
  id: "buyer-1",
  email: "b@b.cl",
  roles: ["USER"],
  sessionId: "s1",
  emailVerified: true,
  tokenVersion: 0,
};

describe("RatingsService", () => {
  const prisma = {
    order: { findUnique: vi.fn() },
    sellerRating: { create: vi.fn(), groupBy: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    user: { findFirst: vi.fn() },
  };
  const audit = { log: vi.fn() };
  const service = new RatingsService(prisma as never, audit as never, { safeEmit: vi.fn() } as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404s when rating another buyer's order", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "o1",
      buyerId: "other",
      sellerId: "seller-1",
      status: "COMPLETED",
      rating: null,
    });
    await expect(service.rate(buyer, "o1", { stars: 5 })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });

  it("blocks rating before the order is completed", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "o1",
      buyerId: buyer.id,
      sellerId: "seller-1",
      status: "DELIVERED",
      rating: null,
    });
    await expect(service.rate(buyer, "o1", { stars: 5 })).rejects.toMatchObject({
      code: ERROR_CODES.ORDER_ILLEGAL_TRANSITION,
      status: HttpStatus.CONFLICT,
    });
  });

  it("rejects a second rating on the same order", async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: "o1",
      buyerId: buyer.id,
      sellerId: "seller-1",
      status: "COMPLETED",
      rating: { id: "r1" },
    });
    await expect(service.rate(buyer, "o1", { stars: 4 })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      status: HttpStatus.CONFLICT,
    });
  });
});
