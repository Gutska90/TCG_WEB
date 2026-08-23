import { describe, expect, it } from "vitest";
import { addCalendarDays, calendarDateOnly, chileCalendarDayRange, CHILE_TZ } from "./chile-time";

function ymdInChile(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHILE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

describe("calendarDateOnly", () => {
  it("uses the Santiago calendar date, not UTC", () => {
    const beforeMidnight = new Date("2026-08-21T03:30:00.000Z");
    const afterMidnight = new Date("2026-08-21T04:00:00.000Z");
    expect(ymdInChile(beforeMidnight)).toBe("2026-08-20");
    expect(calendarDateOnly(beforeMidnight).toISOString().slice(0, 10)).toBe("2026-08-20");
    expect(calendarDateOnly(afterMidnight).toISOString().slice(0, 10)).toBe("2026-08-21");
  });
});

describe("chileCalendarDayRange", () => {
  it("covers the Santiago day that contains the instant", () => {
    const now = new Date("2026-08-21T03:30:00.000Z");
    const { day, from, to } = chileCalendarDayRange(now);
    expect(day.toISOString().slice(0, 10)).toBe("2026-08-20");
    expect(from.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(to.getTime()).toBeGreaterThan(now.getTime());
    expect(ymdInChile(new Date(from.getTime() - 1))).not.toBe("2026-08-20");
    expect(addCalendarDays(day, 1).toISOString().slice(0, 10)).toBe("2026-08-21");
  });
});
