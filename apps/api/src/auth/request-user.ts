import type { Role } from "@tcg/config";

export type RequestUser = {
  id: string;
  email: string;
  roles: Role[];
  sessionId: string;
  emailVerified: boolean;
  tokenVersion: number;
};
