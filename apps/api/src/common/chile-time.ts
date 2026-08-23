/** Calendario de producto y admin: America/Santiago. */

export const CHILE_TZ = "America/Santiago";

export function startOfZonedDay(now: Date, timeZone = CHILE_TZ): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  const local = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(noonUtc))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const offsetMinutes = Number(local.hour) * 60 + Number(local.minute) - 12 * 60;
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMinutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** DATE (UTC midnight) del día calendario en Chile. */
export function calendarDateOnly(value: Date = new Date(), timeZone = CHILE_TZ): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/** Suma días a un DATE ya normalizado (medianoche UTC del Y-M-D). No reinterpreta Chile. */
export function addCalendarDays(dateOnly: Date, days: number): Date {
  const next = new Date(Date.UTC(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function startOfChileDayForDate(dateOnly: Date): Date {
  return startOfZonedDay(new Date(dateOnly.getTime() + 12 * 3600_000));
}

/** Ventana timestamptz del día calendario Chile que contiene `now`. */
export function chileCalendarDayRange(now: Date = new Date()): { day: Date; from: Date; to: Date } {
  const day = calendarDateOnly(now);
  return { day, from: startOfChileDayForDate(day), to: startOfChileDayForDate(addCalendarDays(day, 1)) };
}
