import type { TransactionDto } from "@bluewhale/ipc";

/** Formats a ledger-local ISO date (`YYYY-MM-DD`) for display. */
export function formatLedgerDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

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

/** Returns the display time (`HH:mm`) of a ledger-local timestamp. */
export function displayTime(occurredAtLocal: string): string {
  return occurredAtLocal.slice(11, 16);
}

/** Returns the signed amount label for an entry. */
export function amountLabel(entry: TransactionDto): string {
  const amount = `${entry.amountText} ${entry.currencyCode}`;
  if (entry.kind === "transfer") {
    const received = `${entry.destinationAmountText ?? entry.amountText} ${
      entry.destinationCurrencyCode ?? entry.currencyCode
    }`;
    return `${amount} → ${received}`;
  }
  if (entry.direction === "outflow") {
    return `−${amount}`;
  }
  if (entry.direction === "inflow") {
    return `+${amount}`;
  }
  return amount;
}
