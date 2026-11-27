import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ErrorAlert } from "../../components/error-alert";
import { useMasterData } from "../../lib/master-data-queries";
import {
  emptyTransactionFilters,
  useRestoreTransaction,
  useTransactionList,
} from "../../lib/transaction-queries";
import type { TransactionFilters } from "../../lib/transaction-queries";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import { TransactionEntries } from "./transaction-entries";
import { TransactionFiltersPanel } from "./transaction-filters";

/** The recovery view for soft-deleted transactions. */
export function TransactionRecoveryPage() {
  const { t } = useTranslation();
  const master = useMasterData();
  const [filters, setFilters] = useState<TransactionFilters>(emptyTransactionFilters);
  const debouncedFilters = useDebouncedValue(filters, 300);
  const list = useTransactionList("deleted", debouncedFilters);
  const restore = useRestoreTransaction();
  const [restored, setRestored] = useState(false);
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(emptyTransactionFilters);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("transactions.recoveryTitle")}
          </h1>
          <p className="text-muted">{t("transactions.recoverySubtitle")}</p>
        </div>
        <Link to="/transactions" className="button button-secondary">
          {t("transactions.backToHistory")}
        </Link>
      </header>

      {restored ? (
        <p role="status" className="rounded-md border border-line bg-surface p-3 text-sm">
          {t("transactions.restoredStatus")}{" "}
          <Link to="/transactions" className="text-accent underline">
            {t("transactions.history")}
          </Link>
        </p>
      ) : null}

      {master.isError ? (
        <ErrorAlert error={master.error} onRetry={() => void master.refetch()} />
      ) : null}
      {list.isError ? <ErrorAlert error={list.error} onRetry={() => void list.refetch()} /> : null}
      {restore.isError ? <ErrorAlert error={restore.error} /> : null}

      {master.data ? (
        <TransactionFiltersPanel filters={filters} onChange={setFilters} masterData={master.data} />
      ) : null}

      {master.isPending || list.isPending ? (
        <p className="text-sm text-muted">{t("transactions.loading")}</p>
      ) : null}

      {master.data && list.data ? (
        <TransactionEntries
          entries={list.data.transactions}
          masterData={master.data}
          scope="deleted"
          pendingId={restore.isPending ? (restore.variables ?? null) : null}
          onEdit={() => undefined}
          onDelete={() => undefined}
          onRestore={(entry) => {
            setRestored(false);
            restore.mutate(entry.id, { onSuccess: () => setRestored(true) });
          }}
          emptyTitle={
            filtersActive
              ? t("transactions.noDeletedMatchesTitle")
              : t("transactions.noDeletedTitle")
          }
          emptyBody={
            filtersActive ? t("transactions.noMatchesBody") : t("transactions.noDeletedBody")
          }
        />
      ) : null}
    </section>
  );
}
