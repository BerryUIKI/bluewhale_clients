import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { TransactionDto } from "@bluewhale/ipc";
import { ErrorAlert } from "../../components/error-alert";
import { useMasterData } from "../../lib/master-data-queries";
import {
  emptyTransactionFilters,
  useDeleteTransaction,
  useTransactionList,
} from "../../lib/transaction-queries";
import type { TransactionFilters } from "../../lib/transaction-queries";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import { TransactionEntries } from "./transaction-entries";
import { TransactionFiltersPanel } from "./transaction-filters";

/** The transaction history with search, filters, and soft deletion. */
export function TransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const master = useMasterData();
  const [filters, setFilters] = useState<TransactionFilters>(emptyTransactionFilters);
  const debouncedFilters = useDebouncedValue(filters, 300);
  const list = useTransactionList("active", debouncedFilters);
  const remove = useDeleteTransaction();
  const [confirming, setConfirming] = useState<TransactionDto | null>(null);
  const [deleted, setDeleted] = useState(false);
  const navigationStatus = (location.state as { status?: string } | null)?.status;
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(emptyTransactionFilters);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("transactions.title")}</h1>
          <p className="text-muted">{t("transactions.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/transactions/recovery" className="button button-secondary">
            {t("transactions.recovery")}
          </Link>
          <Link to="/transactions/new" className="button">
            {t("transactions.newTransaction")}
          </Link>
        </div>
      </header>

      {navigationStatus === "created" ? (
        <p role="status" className="rounded-md border border-line bg-surface p-3 text-sm">
          {t("transactions.createdStatus")}
        </p>
      ) : null}
      {navigationStatus === "updated" ? (
        <p role="status" className="rounded-md border border-line bg-surface p-3 text-sm">
          {t("transactions.updatedStatus")}
        </p>
      ) : null}
      {deleted ? (
        <p role="status" className="rounded-md border border-line bg-surface p-3 text-sm">
          {t("transactions.deletedStatus")}{" "}
          <Link to="/transactions/recovery" className="text-accent underline">
            {t("transactions.openRecovery")}
          </Link>
        </p>
      ) : null}

      {master.isError ? (
        <ErrorAlert error={master.error} onRetry={() => void master.refetch()} />
      ) : null}
      {list.isError ? <ErrorAlert error={list.error} onRetry={() => void list.refetch()} /> : null}
      {remove.isError ? <ErrorAlert error={remove.error} /> : null}

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
          scope="active"
          pendingId={remove.isPending ? (remove.variables ?? null) : null}
          onEdit={(entry) => navigate(`/transactions/${entry.id}/edit`)}
          onDelete={(entry) => {
            setDeleted(false);
            setConfirming(entry);
          }}
          onRestore={() => undefined}
          emptyTitle={
            filtersActive ? t("transactions.noMatchesTitle") : t("transactions.emptyTitle")
          }
          emptyBody={filtersActive ? t("transactions.noMatchesBody") : t("transactions.emptyBody")}
        />
      ) : null}

      <AlertDialog.Root
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-6 shadow-xl">
            <AlertDialog.Title className="text-lg font-semibold">
              {t("transactions.deleteTitle")}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted">
              {t("transactions.deleteBody")}
            </AlertDialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button type="button" className="button button-secondary">
                  {t("transactions.deleteCancel")}
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => {
                    if (confirming) {
                      remove.mutate(confirming.id, {
                        onSuccess: () => {
                          setConfirming(null);
                          setDeleted(true);
                        },
                      });
                    }
                  }}
                >
                  {t("transactions.deleteConfirm")}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
