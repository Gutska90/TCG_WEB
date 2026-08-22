import { describe, expect, it } from "vitest";
import { addDays, CHILE_TZ, startOfZonedDay } from "./admin.time";

function ymdInChile(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

describe("startOfZonedDay", () => {
  it("returns midnight of the Santiago calendar day", () => {
    const now = new Date("2026-08-21T01:30:00.000Z");
    const start = startOfZonedDay(now);
    expect(ymdInChile(start)).toBe(ymdInChile(now));
    expect(start.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(addDays(start, 1).getTime()).toBeGreaterThan(now.getTime());
    expect(ymdInChile(new Date(start.getTime() - 1))).not.toBe(ymdInChile(start));
  });
});
