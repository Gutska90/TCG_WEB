export type MobileAppEnv = "development" | "staging" | "production";

export type MobileReleaseInput = {
  appEnv: string;
  apiBaseUrl: string;
  enableRealPayments: boolean;
  easProjectId?: string;
  easBuild?: boolean;
};

export function normalizeMobileAppEnv(value: string | undefined): MobileAppEnv;
export function isCleartextAllowed(appEnv: MobileAppEnv): boolean;
export function assertMobileReleaseEnv(input: MobileReleaseInput): void;
