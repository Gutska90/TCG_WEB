import { ADMIN_OPS_ROLES, MODERATION_ROLES, type Role } from "@tcg/config";

export function canAccessAdminOps(roles: Role[]): boolean {
  return ADMIN_OPS_ROLES.some((role) => roles.includes(role));
}

export function canAccessModeration(roles: Role[]): boolean {
  return MODERATION_ROLES.some((role) => roles.includes(role));
}

export function canAccessAdminApp(roles: Role[]): boolean {
  return canAccessAdminOps(roles) || canAccessModeration(roles);
}
