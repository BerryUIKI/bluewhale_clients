/** Reporting currencies offered at setup. The core validates the code. */
export const CURRENCIES = [
  "USD",
  "EUR",
  "CNY",
  "JPY",
  "GBP",
  "HKD",
  "TWD",
  "SGD",
  "AUD",
  "CAD",
  "CHF",
  "KRW",
  "INR",
] as const;

/** Time zones offered at setup. The core validates the identifier. */
export const TIME_ZONES = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];
export type TimeZoneIdentifier = (typeof TIME_ZONES)[number];

/** Returns the system time zone when it is offered, otherwise UTC. */
export function preferredTimeZone(): TimeZoneIdentifier {
  const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (TIME_ZONES as readonly string[]).includes(current)
    ? (current as TimeZoneIdentifier)
    : "UTC";
}
