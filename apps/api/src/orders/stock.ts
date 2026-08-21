import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ERROR_CODES } from "@tcg/config";
import { AppError } from "../common/errors/app-error";

export async function reserveStock(
  tx: Prisma.TransactionClient,
  listingId: string,
  qty: number,
): Promise<void> {
  const rows = await tx.$executeRaw`
    UPDATE listings
    SET quantity_reserved = quantity_reserved + ${qty}, updated_at = NOW()
    WHERE id = ${listingId}::uuid
      AND status = 'ACTIVE'::"ListingStatus"
      AND quantity - quantity_reserved >= ${qty}
  `;
  if (rows !== 1) {
    throw new AppError(
      HttpStatus.CONFLICT,
      ERROR_CODES.LISTING_INSUFFICIENT_STOCK,
      "No hay stock suficiente",
      { listingId, requested: qty },
    );
  }
}

export async function releaseStock(
  tx: Prisma.TransactionClient,
  listingId: string,
  qty: number,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE listings
    SET quantity_reserved = GREATEST(quantity_reserved - ${qty}, 0), updated_at = NOW()
    WHERE id = ${listingId}::uuid
      AND quantity_reserved >= ${qty}
  `;
}

export async function consumeReservedStock(
  tx: Prisma.TransactionClient,
  listingId: string,
  qty: number,
): Promise<void> {
  const rows = await tx.$executeRaw`
    UPDATE listings
    SET
      quantity = quantity - ${qty},
      quantity_reserved = quantity_reserved - ${qty},
      status = CASE WHEN quantity - ${qty} <= 0 THEN 'SOLD'::"ListingStatus" ELSE status END,
      updated_at = NOW()
    WHERE id = ${listingId}::uuid
      AND quantity >= ${qty}
      AND quantity_reserved >= ${qty}
  `;
  if (rows !== 1) {
    throw new AppError(
      HttpStatus.CONFLICT,
      ERROR_CODES.LISTING_INSUFFICIENT_STOCK,
      "No hay stock suficiente",
      { listingId },
    );
  }
}

export async function restoreSoldStock(
  tx: Prisma.TransactionClient,
  listingId: string,
  qty: number,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE listings
    SET
      quantity = quantity + ${qty},
      status = CASE WHEN status = 'SOLD'::"ListingStatus" THEN 'ACTIVE'::"ListingStatus" ELSE status END,
      updated_at = NOW()
    WHERE id = ${listingId}::uuid
  `;
}
