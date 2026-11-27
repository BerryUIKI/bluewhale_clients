import { useTranslation } from "react-i18next";
import { errorMessageKey } from "../lib/errors";

/** Shows a localized command failure with an optional retry action. */
export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
      <p className="font-medium text-danger">{t(errorMessageKey(error))}</p>
      {onRetry ? (
        <button type="button" className="button button-secondary mt-3" onClick={onRetry}>
          {t("masterData.retry")}
        </button>
      ) : null}
    </div>
  );
}
