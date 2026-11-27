import { useTranslation } from "react-i18next";
import type { MissingRateDto } from "@bluewhale/ipc";

/** The explicit incomplete-state notice for a missing conversion rate. */
export function MissingRateNotice({
  missingRate,
  scope,
}: {
  missingRate: MissingRateDto;
  scope?: string;
}) {
  const { t } = useTranslation();
  return (
    <section role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-4">
      {scope ? <p className="text-xs font-semibold uppercase tracking-wide">{scope}</p> : null}
      <h2 className="text-base font-semibold text-danger">{t("dashboard.missingRateTitle")}</h2>
      <p className="mt-1 text-sm text-danger">
        {t("dashboard.missingRateBody", {
          source: missingRate.sourceCurrency,
          reporting: missingRate.reportingCurrency,
        })}
      </p>
      <p className="mt-1 text-sm text-muted">{t("dashboard.missingRateHint")}</p>
    </section>
  );
}
