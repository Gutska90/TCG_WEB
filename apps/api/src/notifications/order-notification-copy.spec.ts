import { describe, expect, it } from "vitest";
import { formatClp, orderCardLabel } from "./order-notification-copy";

describe("order notification copy", () => {
  it("formats CLP with a peso sign", () => {
    expect(formatClp(80000).startsWith("$")).toBe(true);
    expect(formatClp(80000)).toMatch(/80/);
  });

  it("summarizes extra line items", () => {
    expect(orderCardLabel([{ titleSnapshot: "IT Card" }])).toBe("IT Card");
    expect(
      orderCardLabel([{ titleSnapshot: "IT Card" }, { titleSnapshot: "Otra" }]),
    ).toBe("IT Card y 1 más");
  });
});
