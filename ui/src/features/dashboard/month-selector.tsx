import { useTranslation } from "react-i18next";
import { formatMonth, ledgerMonth, shiftMonth } from "../../lib/dates";

/** The month navigation shared by the dashboard and reports. */
export function MonthSelector({
  month,
  timeZoneIdentifier,
  onChange,
}: {
  month: string;
  timeZoneIdentifier: string;
  onChange: (month: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const current = ledgerMonth(timeZoneIdentifier);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <button
        type="button"
        className="button button-secondary"
        aria-label={t("dashboard.previousMonth")}
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        ‹
      </button>
      <label className="text-sm">
        <span className="block font-medium">{t("dashboard.month")}</span>
        <input
          type="month"
          className="input mt-1"
          value={month}
          onChange={(event) => {
            if (event.target.value !== "") {
              onChange(event.target.value);
            }
          }}
        />
      </label>
      <button
        type="button"
        className="button button-secondary"
        aria-label={t("dashboard.nextMonth")}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        ›
      </button>
      <button
        type="button"
        className="button button-secondary"
        disabled={month === current}
        onClick={() => onChange(current)}
      >
        {t("dashboard.thisMonth")}
      </button>
      <span className="pb-2 text-sm text-muted">{formatMonth(month, i18n.language)}</span>
    </div>
  );
}
