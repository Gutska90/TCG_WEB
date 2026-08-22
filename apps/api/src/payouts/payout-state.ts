import { ERROR_CODES, type PayoutStatus } from "@tcg/config";
import { HttpStatus } from "@nestjs/common";
import { AppError } from "../common/errors/app-error";

export const PAYOUT_TRANSITIONS: Record<PayoutStatus, readonly PayoutStatus[]> = {
  PENDING: ["APPROVED", "CANCELLED"],
  APPROVED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED"],
  FAILED: ["PROCESSING"],
  PAID: [],
  CANCELLED: [],
};

export function assertPayoutTransition(from: PayoutStatus, to: PayoutStatus): void {
  if (!PAYOUT_TRANSITIONS[from].includes(to)) {
    throw new AppError(
      HttpStatus.CONFLICT,
      ERROR_CODES.PAYOUT_ILLEGAL_TRANSITION,
      `Transición de payout inválida: ${from} → ${to}`,
    );
  }
}
