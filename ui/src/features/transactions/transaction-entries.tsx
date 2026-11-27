import { useTranslation } from "react-i18next";
import type { MasterDataDto, TransactionDto, TransactionScopeDto } from "@bluewhale/ipc";
import { amountLabel, displayTime, formatLedgerDate } from "./transaction-format";

/** The transaction list grouped by ledger-local day. */
export function TransactionEntries({
  entries,
  masterData,
  scope,
  pendingId,
  onEdit,
  onDelete,
  onRestore,
  emptyTitle,
  emptyBody,
}: {
  entries: TransactionDto[];
  masterData: MasterDataDto;
  scope: TransactionScopeDto;
  pendingId: string | null;
  onEdit: (entry: TransactionDto) => void;
  onDelete: (entry: TransactionDto) => void;
  onRestore: (entry: TransactionDto) => void;
  emptyTitle: string;
  emptyBody: string;
}) {
  const { t, i18n } = useTranslation();
  const accounts = new Map(masterData.accounts.map((account) => [account.id, account]));
  const categories = new Map(masterData.categories.map((category) => [category.id, category]));
  const categoryGroups = new Map(masterData.categoryGroups.map((group) => [group.id, group.name]));
  const tags = new Map(masterData.tags.map((tag) => [tag.id, tag]));
  const counterparties = new Map(
    masterData.counterparties.map((counterparty) => [counterparty.id, counterparty]),
  );

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface p-6 text-center">
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted">{emptyBody}</p>
      </div>
    );
  }

  const days = new Map<string, TransactionDto[]>();
  for (const entry of entries) {
    const day = days.get(entry.occurredOn);
    if (day) {
      day.push(entry);
    } else {
      days.set(entry.occurredOn, [entry]);
    }
  }

  return (
    <div className="space-y-6">
      {[...days.entries()].map(([day, dayEntries]) => {
        const headingId = `transaction-day-${day}`;
        return (
          <section key={day} aria-labelledby={headingId} className="space-y-2">
            <h2 id={headingId} className="text-sm font-semibold text-muted">
              {formatLedgerDate(day, i18n.language)}
            </h2>
            <ul className="space-y-2">
              {dayEntries.map((entry) => {
                const account = accounts.get(entry.accountId);
                const destination = entry.destinationAccountId
                  ? accounts.get(entry.destinationAccountId)
                  : undefined;
                const category = entry.categoryId ? categories.get(entry.categoryId) : undefined;
                const categoryGroup = category?.groupId
                  ? categoryGroups.get(category.groupId)
                  : undefined;
                const counterparty = entry.counterpartyId
                  ? counterparties.get(entry.counterpartyId)
                  : undefined;
                const entryTags = entry.tagIds
                  .map((id) => tags.get(id))
                  .filter((tag) => tag !== undefined);
                const accountLine =
                  entry.kind === "transfer" && destination
                    ? `${account?.name ?? ""} → ${destination.name}`
                    : (account?.name ?? "");
                const pending = pendingId === entry.id;

                return (
                  <li key={entry.id} className="rounded-lg border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold tabular-nums">{amountLabel(entry)}</span>
                          <span className="badge">{t(`transactions.kinds.${entry.kind}`)}</span>
                          {entry.isDeleted ? (
                            <span className="badge badge-danger">
                              {t("transactions.deletedBadge")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted">{accountLine}</p>
                        {entry.note ? <p className="mt-1 text-sm">{entry.note}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                          {category ? (
                            <span>
                              {categoryGroup ? `${categoryGroup} · ` : ""}
                              {category.name}
                            </span>
                          ) : null}
                          {counterparty ? <span>{counterparty.name}</span> : null}
                          {entryTags.map((tag) => (
                            <span key={tag.id} className="flex items-center gap-1.5">
                              <span
                                aria-hidden="true"
                                className="inline-block size-2.5 rounded-full border border-line"
                                style={{ backgroundColor: tag.colorHex }}
                              />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-xs text-muted">
                          {displayTime(entry.occurredAtLocal)}
                        </span>
                        <div className="flex items-center gap-2">
                          {scope === "active" && entry.kind !== "opening_balance" ? (
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => onEdit(entry)}
                            >
                              {t("masterData.edit")}
                            </button>
                          ) : null}
                          {scope === "active" ? (
                            <button
                              type="button"
                              className="text-sm font-medium text-danger underline disabled:opacity-60"
                              disabled={pending}
                              onClick={() => onDelete(entry)}
                            >
                              {t("transactions.delete")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="button button-secondary"
                              disabled={pending}
                              onClick={() => onRestore(entry)}
                            >
                              {t("masterData.restore")}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
