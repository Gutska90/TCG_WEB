import { createHash, randomBytes } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function slugFromName(displayName: string): string {
  const base =
    displayName
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "user";
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
