import { describe, expect, it } from "vitest";
import { slugifyStable, uniqueSlug } from "./slug";

describe("catalog slugs", () => {
  it("slugifies names without random suffixes", () => {
    expect(slugifyStable("Test Mon #1")).toBe("test-mon-1");
  });

  it("disambiguates collisions", () => {
    const taken = new Set<string>(["bolt"]);
    expect(uniqueSlug("bolt", taken)).toBe("bolt-2");
    expect(uniqueSlug("bolt", taken)).toBe("bolt-3");
  });
});
