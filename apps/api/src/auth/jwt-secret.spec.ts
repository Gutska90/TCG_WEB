import { describe, expect, it } from "vitest";
import { resolveJwtAccessSecret, TEST_JWT_ACCESS_SECRET } from "./jwt-secret";

const STRONG = "a".repeat(32);

describe("resolveJwtAccessSecret", () => {
  it("rejects empty secrets outside test", () => {
    expect(() => resolveJwtAccessSecret("", "development")).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => resolveJwtAccessSecret(undefined, "production")).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects placeholders and short values", () => {
    expect(() => resolveJwtAccessSecret("dev-only-change-me", "development")).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => resolveJwtAccessSecret("change-me-in-local", "production")).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => resolveJwtAccessSecret("short-secret-value", "development")).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("accepts a long non-placeholder secret", () => {
    expect(resolveJwtAccessSecret(STRONG, "development")).toBe(STRONG);
    expect(resolveJwtAccessSecret(STRONG, "production")).toBe(STRONG);
  });

  it("uses the test fallback when NODE_ENV=test and the secret is missing", () => {
    expect(resolveJwtAccessSecret(undefined, "test")).toBe(TEST_JWT_ACCESS_SECRET);
    expect(resolveJwtAccessSecret("change-me-in-local", "test")).toBe(TEST_JWT_ACCESS_SECRET);
  });

  it("rejects the test-only secret outside test", () => {
    expect(() => resolveJwtAccessSecret(TEST_JWT_ACCESS_SECRET, "production")).toThrow(/JWT_ACCESS_SECRET/);
  });
});
