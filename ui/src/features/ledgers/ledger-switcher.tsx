import { useTranslation } from "react-i18next";
import { errorMessageKey } from "../../lib/errors";
import { useLedgerList, useSwitchLedger } from "../../lib/ledger-queries";

/** Switches the open ledger from the shell. */
export function LedgerSwitcher() {
  const { t } = useTranslation();
  const ledgers = useLedgerList();
  const switchLedger = useSwitchLedger();

  if (!ledgers.data) {
    return null;
  }

  return (
    <div className="px-3 pb-4 md:px-5">
      <label htmlFor="ledger-switcher" className="text-xs font-medium text-muted">
        {t("ledgers.switchLabel")}
      </label>
      <select
        id="ledger-switcher"
        className="mt-1 w-full rounded-md border border-line bg-canvas px-2 py-1.5 text-sm text-ink"
        value={ledgers.data.activeLedgerId ?? ""}
        disabled={switchLedger.isPending || ledgers.data.ledgers.length < 2}
        onChange={(event) => {
          if (event.target.value) {
            switchLedger.mutate(event.target.value);
          }
        }}
      >
        {ledgers.data.ledgers.map((ledger) => (
          <option key={ledger.id} value={ledger.id} disabled={ledger.status === "unavailable"}>
            {ledger.emoji} {ledger.name}
            {ledger.status === "unavailable" ? ` — ${t("ledgers.unavailableTitle")}` : ""}
          </option>
        ))}
      </select>
      {switchLedger.isError ? (
        <p role="alert" className="mt-2 text-xs text-danger">
          {t(errorMessageKey(switchLedger.error))}
        </p>
      ) : null}
    </div>
  );
}
