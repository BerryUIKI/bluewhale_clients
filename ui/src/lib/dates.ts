/** Returns the current ledger-local date and time as `YYYY-MM-DDTHH:mm`. */
export function ledgerNowLocal(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
  } catch {
    return new Date().toISOString().slice(0, 16);
  }
}

/** Returns the current ledger-local month as `YYYY-MM`. */
export function ledgerMonth(timeZone: string): string {
  return ledgerNowLocal(timeZone).slice(0, 7);
}

/** Moves a `YYYY-MM` month by a number of months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return month;
  }
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Formats a `YYYY-MM` month for display. */
export function formatMonth(month: string, locale: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) {
    return month;
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}
