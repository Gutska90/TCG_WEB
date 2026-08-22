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
