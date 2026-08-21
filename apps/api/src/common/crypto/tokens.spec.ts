import { describe, expect, it } from "vitest";
import { normalizeEmail, sha256, slugFromName } from "./tokens";

describe("tokens", () => {
  it("normalizes email", () => {
    expect(normalizeEmail("  Foo@Bar.CL ")).toBe("foo@bar.cl");
  });

  it("hashes stably", () => {
    expect(sha256("abc")).toBe(sha256("abc"));
    expect(sha256("abc")).not.toBe(sha256("abd"));
  });

  it("builds a url-safe slug", () => {
    const slug = slugFromName("Poké Store!");
    expect(slug.startsWith("poke-store-")).toBe(true);
  });
});
