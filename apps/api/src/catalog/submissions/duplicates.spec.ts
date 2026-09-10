import { describe, expect, it } from "vitest";
import { isLikelyDuplicateCard, normalizeCatalogName } from "./duplicates";

describe("catalog duplicate detection", () => {
  it("matches normalized names in the same set", () => {
    expect(normalizeCatalogName("Brunhild")).toBe("brunhild");
    expect(
      isLikelyDuplicateCard(
        { name: "Brunhild", number: "123", setId: "set-1" },
        { name: "brunhild", number: "123", setId: "set-1" },
      ),
    ).toBe(true);
  });

  it("does not match a different set when both sets are known", () => {
    expect(
      isLikelyDuplicateCard(
        { name: "Brunhild", number: "123", setId: "set-1" },
        { name: "Brunhild", number: "999", setId: "set-2" },
      ),
    ).toBe(false);
  });
});
