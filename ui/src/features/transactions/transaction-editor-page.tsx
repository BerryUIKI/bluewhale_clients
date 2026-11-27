import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { ErrorAlert } from "../../components/error-alert";
import { useActiveLedgerProfile } from "../../lib/ledger-queries";
import { useMasterData } from "../../lib/master-data-queries";
import { useTransaction } from "../../lib/transaction-queries";
import { TransactionForm } from "./transaction-form";

/** The create and edit screen for one transaction. */
export function TransactionEditorPage({ mode }: { mode: "create" | "edit" }) {
  const { t } = useTranslation();
  const { transactionId } = useParams<{ transactionId: string }>();
  const master = useMasterData();
  const profile = useActiveLedgerProfile();
  const transaction = useTransaction(mode === "edit" ? (transactionId ?? null) : null);
  const title = mode === "edit" ? t("transactions.editTitle") : t("transactions.createTitle");
  const subtitle =
    mode === "edit" ? t("transactions.editSubtitle") : t("transactions.createSubtitle");

  const loading =
    master.isPending || profile.isPending || (mode === "edit" && transaction.isPending);
  const error = master.error ?? profile.error ?? (mode === "edit" ? transaction.error : null);
  const retry = () => {
    void master.refetch();
    void profile.refetch();
    if (mode === "edit") {
      void transaction.refetch();
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted">{subtitle}</p>
        </div>
        <Link to="/transactions" className="button button-secondary">
          {t("transactions.backToHistory")}
        </Link>
      </header>

      {error ? <ErrorAlert error={error} onRetry={retry} /> : null}
      {loading ? <p className="text-sm text-muted">{t("transactions.loading")}</p> : null}

      {mode === "edit" && !transactionId ? (
        <div className="rounded-lg border border-dashed border-line bg-surface p-6 text-center">
          <p className="font-medium">{t("transactions.notFoundTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("transactions.notFoundBody")}</p>
        </div>
      ) : null}

      {mode === "edit" && transaction.data?.isDeleted ? (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">{t("transactions.deletedTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("transactions.deletedBody")}</p>
          <Link
            to="/transactions/recovery"
            className="mt-3 inline-block text-sm text-accent underline"
          >
            {t("transactions.recovery")}
          </Link>
        </div>
      ) : null}

      {mode === "edit" && transaction.data?.kind === "opening_balance" ? (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">{t("transactions.openingBalanceTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("transactions.openingBalanceBody")}</p>
          <Link to="/transactions" className="mt-3 inline-block text-sm text-accent underline">
            {t("transactions.backToHistory")}
          </Link>
        </div>
      ) : null}

      {master.data && profile.data ? (
        mode === "create" ||
        (transaction.data &&
          !transaction.data.isDeleted &&
          transaction.data.kind !== "opening_balance") ? (
          <div className="rounded-lg border border-line bg-surface p-6">
            <TransactionForm
              key={transaction.data?.id ?? "new"}
              transaction={transaction.data ?? null}
              masterData={master.data}
              timeZoneIdentifier={profile.data.timeZoneIdentifier}
            />
          </div>
        ) : null
      ) : null}
    </section>
  );
}
