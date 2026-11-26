import { isIpcError } from "@bluewhale/ipc";

const KNOWN_CODES: ReadonlySet<string> = new Set([
  "conflict",
  "forbidden",
  "internal",
  "invalid_request",
  "not_found",
  "unavailable",
]);

/**
 * Returns the localization key for a command failure.
 *
 * Unknown errors, including framework failures that never reached a command,
 * map to the internal message so no raw text reaches the interface.
 */
export function errorMessageKey(error: unknown): string {
  if (isIpcError(error) && KNOWN_CODES.has(error.code)) {
    return `errors.${error.code}`;
  }
  return "errors.internal";
}

/** Returns whether the failure means the desktop runtime is not available. */
export function isUnavailable(error: unknown): boolean {
  return isIpcError(error) && error.code === "unavailable";
}
