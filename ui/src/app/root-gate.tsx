import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { errorMessageKey, errorPath } from "../lib/errors";
import { useLedgerList } from "../lib/ledger-queries";
import { FullScreen } from "./full-screen";

/**
 * Waits for the ledger catalog before rendering the shell.
 *
 * With no ledgers the only reachable page is the first-run setup. A catalog
 * that cannot be read blocks the interface with its reason and a retry, and is
 * never overwritten.
 */
export function RootGate() {
  const { t } = useTranslation();
  const location = useLocation();
  const ledgers = useLedgerList();

  if (ledgers.isPending) {
    return (
      <FullScreen>
        <p className="text-muted">{t("ledgers.loading")}</p>
      </FullScreen>
    );
  }

  if (ledgers.isError) {
    const path = errorPath(ledgers.error);
    return (
      <FullScreen title={t("ledgers.errorTitle")} isError>
        <p className="font-medium text-danger">{t(errorMessageKey(ledgers.error))}</p>
        {path ? <p className="mt-2 font-mono text-xs break-all text-muted">{path}</p> : null}
        <button type="button" className="button mt-4" onClick={() => void ledgers.refetch()}>
          {t("ledgers.retry")}
        </button>
      </FullScreen>
    );
  }

  if (ledgers.data.ledgers.length === 0) {
    return location.pathname === "/setup" ? <Outlet /> : <Navigate to="/setup" replace />;
  }

  if (location.pathname === "/setup") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
