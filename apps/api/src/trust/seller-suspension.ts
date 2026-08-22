import { HttpStatus } from "@nestjs/common";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";
import { PrismaService } from "../prisma/prisma.service";

export async function findActiveSuspension(prisma: PrismaService, sellerId: string) {
  return prisma.sellerSuspension.findFirst({
    where: { sellerId, liftedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function assertSellerNotSuspended(prisma: PrismaService, sellerId: string): Promise<void> {
  const row = await findActiveSuspension(prisma, sellerId);
  if (row) {
    throw new AppError(
      HttpStatus.FORBIDDEN,
      ERROR_CODES.SELLER_SUSPENDED,
      "Esta cuenta de vendedor está suspendida",
    );
  }
}
