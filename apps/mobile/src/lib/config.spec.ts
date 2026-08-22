import { describe, expect, it } from "vitest";
import { isAllowedAuthRedirect } from "./oauth-redirect";

describe("auth deep links", () => {
  it("allows the app scheme callback", () => {
    expect(isAllowedAuthRedirect("tcgplatform://oauth")).toBe(true);
    expect(isAllowedAuthRedirect("tcgplatform://oauth/")).toBe(true);
  });

  it("rejects open redirects", () => {
    expect(isAllowedAuthRedirect("https://evil.example/phish")).toBe(false);
    expect(isAllowedAuthRedirect("tcgplatform://not-oauth")).toBe(false);
  });
});
