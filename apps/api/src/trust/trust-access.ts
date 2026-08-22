import { HttpStatus } from "@nestjs/common";
import { ADMIN_OPS_ROLES, ERROR_CODES, MODERATION_ROLES, type DisputeStatus } from "@tcg/config";
import type { RequestUser } from "../auth/request-user";
import { AppError } from "../common/errors/app-error";

export const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = [
  "OPEN",
  "WAITING_BUYER",
  "WAITING_SELLER",
  "UNDER_REVIEW",
];

const FROM: Record<DisputeStatus, DisputeStatus[]> = {
  OPEN: ["WAITING_BUYER", "WAITING_SELLER", "UNDER_REVIEW", "RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"],
  WAITING_BUYER: ["WAITING_SELLER", "UNDER_REVIEW", "RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"],
  WAITING_SELLER: ["WAITING_BUYER", "UNDER_REVIEW", "RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"],
  UNDER_REVIEW: ["WAITING_BUYER", "WAITING_SELLER", "RESOLVED_BUYER", "RESOLVED_SELLER", "CANCELLED"],
  RESOLVED_BUYER: [],
  RESOLVED_SELLER: [],
  CANCELLED: [],
};

export function assertDisputeTransition(from: DisputeStatus, to: DisputeStatus): void {
  if (!FROM[from].includes(to)) {
    throw new AppError(
      HttpStatus.CONFLICT,
      ERROR_CODES.DISPUTE_ILLEGAL_TRANSITION,
      "Transición de disputa no permitida",
    );
  }
}

export function isModerationStaff(user: RequestUser): boolean {
  const allowed = new Set<string>(MODERATION_ROLES);
  return user.roles.some((role) => allowed.has(role));
}

export function isAdminOps(user: RequestUser): boolean {
  const allowed = new Set<string>(ADMIN_OPS_ROLES);
  return user.roles.some((role) => allowed.has(role));
}

export function assertModerationStaff(user: RequestUser): void {
  if (!isModerationStaff(user)) {
    throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, "Se requiere moderación");
  }
}

export function assertAdminOps(user: RequestUser): void {
  if (!isAdminOps(user)) {
    throw new AppError(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, "Se requiere ADMIN o SUPER_ADMIN");
  }
}

export function assertPartyOrStaff(user: RequestUser, buyerId: string, sellerId: string): void {
  if (user.id === buyerId || user.id === sellerId || isModerationStaff(user)) return;
  throw new AppError(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, "Disputa no encontrada");
}
