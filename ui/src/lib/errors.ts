import { isIpcError } from "@bluewhale/ipc";

const KNOWN_CODES: ReadonlySet<string> = new Set([
  "conflict",
  "forbidden",
  "internal",
  "invalid_request",
  "not_found",
  "unavailable",
]);

const KNOWN_MESSAGE_KEYS: ReadonlySet<string> = new Set([
  "errors.conflict",
  "errors.forbidden",
  "errors.internal",
  "errors.invalid_request",
  "errors.not_found",
  "errors.unavailable",
  "errors.ledger_name",
  "errors.ledger_emoji",
  "errors.ledger_currency",
  "errors.ledger_time_zone",
  "errors.ledger_defaults",
  "errors.ledger_not_found",
  "errors.ledger_conflict",
  "errors.ledger_catalog",
  "errors.ledger_missing_database",
  "errors.ledger_missing_key",
  "errors.ledger_key_unreadable",
  "errors.ledger_database_unreadable",
  "errors.ledger_not_initialized",
  "errors.ledger_key_store",
  "errors.ledger_internal",
  "errors.master_data_no_ledger",
  "errors.master_data_name",
  "errors.master_data_color",
  "errors.master_data_currency",
  "errors.master_data_reference",
  "errors.master_data_amount",
  "errors.master_data_not_found",
  "errors.master_data_group_archived",
  "errors.master_data_kind_mismatch",
  "errors.master_data_not_initialized",
  "errors.master_data_internal",
  "errors.transaction_no_ledger",
  "errors.transaction_not_initialized",
  "errors.transaction_reference",
  "errors.transaction_date",
  "errors.transaction_date_range",
  "errors.transaction_amount",
  "errors.transaction_amount_positive",
  "errors.transaction_account",
  "errors.transaction_destination_account",
  "errors.transaction_category",
  "errors.transaction_category_required",
  "errors.transaction_tag",
  "errors.transaction_counterparty",
  "errors.transaction_transfer",
  "errors.transaction_field_not_allowed",
  "errors.transaction_not_found",
  "errors.transaction_deleted",
  "errors.transaction_opening_balance",
  "errors.transaction_filter_reference",
  "errors.transaction_internal",
]);

/**
 * Returns the localization key for a command failure.
 *
 * The command's specific message key wins when it is one of the keys shipped in
 * the locales; otherwise the code determines a generic message. Unknown errors,
 * including framework failures that never reached a command, map to the
 * internal message so no raw text reaches the interface.
 */
export function errorMessageKey(error: unknown): string {
  if (isIpcError(error)) {
    if (KNOWN_MESSAGE_KEYS.has(error.messageKey)) {
      return error.messageKey;
    }
    if (KNOWN_CODES.has(error.code)) {
      return `errors.${error.code}`;
    }
  }
  return "errors.internal";
}

/** Returns the literal path attached to a failure, when one is present. */
export function errorPath(error: unknown): string | null {
  if (!isIpcError(error)) {
    return null;
  }
  const detail = error.details.find((entry) => entry.field === "path");
  return detail?.value ?? null;
}

/** Returns whether the failure means the desktop runtime is not available. */
export function isUnavailable(error: unknown): boolean {
  return isIpcError(error) && error.code === "unavailable";
}
