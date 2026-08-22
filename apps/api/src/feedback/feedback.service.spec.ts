import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, PLATFORM } from "@tcg/config";
import { FeedbackService } from "./feedback.service";

describe("FeedbackService", () => {
  const prisma = {
    feedback: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
  const service = new FeedbackService(prisma as never);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rate-limits repeated feedback from the same user", async () => {
    prisma.feedback.count.mockResolvedValue(PLATFORM.feedbackMaxPerWindow);
    await expect(
      service.create(
        { category: "OTHER", message: "El checkout se siente lento en beta." },
        { user: { id: "u1" } as never, ip: "1.1.1.1" },
      ),
    ).rejects.toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });
});
