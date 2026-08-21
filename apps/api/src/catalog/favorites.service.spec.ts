import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES } from "@tcg/config";
import { FavoritesService } from "./favorites.service";

describe("FavoritesService", () => {
  const prisma = {
    cardVariant: { findUnique: vi.fn() },
    favorite: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  const service = new FavoritesService(prisma as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404s when the variant does not exist", async () => {
    prisma.cardVariant.findUnique.mockResolvedValue(null);
    await expect(service.add("user-1", "missing")).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      status: HttpStatus.NOT_FOUND,
    });
  });
});
