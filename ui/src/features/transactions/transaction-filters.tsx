import { useTranslation } from "react-i18next";
import type { MasterDataDto, TransactionKindDto } from "@bluewhale/ipc";
import { emptyTransactionFilters } from "../../lib/transaction-queries";
import type { TransactionFilters } from "../../lib/transaction-queries";

const KINDS: TransactionKindDto[] = ["expense", "income", "transfer", "opening_balance"];

/** The search, kind, reference, and date filters of a transaction list. */
export function TransactionFiltersPanel({
  filters,
  onChange,
  masterData,
}: {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
  masterData: MasterDataDto;
}) {
  const { t } = useTranslation();
  const update = (patch: Partial<TransactionFilters>) => onChange({ ...filters, ...patch });
  const suffix = (isArchived: boolean) => (isArchived ? ` (${t("masterData.archived")})` : "");

  return (
    <section
      aria-labelledby="transaction-filters-heading"
      className="rounded-lg border border-line bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="transaction-filters-heading" className="text-sm font-semibold">
          {t("transactions.filters")}
        </h2>
        <button
          type="button"
          className="text-sm font-medium text-accent underline"
          onClick={() => onChange(emptyTransactionFilters)}
        >
          {t("transactions.clearFilters")}
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="font-medium">{t("transactions.search")}</span>
          <input
            type="search"
            className="input mt-1"
            placeholder={t("transactions.searchPlaceholder")}
            value={filters.searchText}
            onChange={(event) => update({ searchText: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("transactions.kind")}</span>
          <select
            className="input mt-1"
            value={filters.kind ?? ""}
            onChange={(event) =>
              update({ kind: (event.target.value as TransactionKindDto) || null })
            }
          >
            <option value="">{t("transactions.allKinds")}</option>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`transactions.kinds.${kind}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("transactions.account")}</span>
          <select
            className="input mt-1"
            value={filters.accountId ?? ""}
            onChange={(event) => update({ accountId: event.target.value || null })}
          >
            <option value="">{t("transactions.allAccounts")}</option>
            {masterData.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
                {suffix(account.isArchived)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("transactions.category")}</span>
          <select
            className="input mt-1"
            value={filters.categoryId ?? ""}
            onChange={(event) => update({ categoryId: event.target.value || null })}
          >
            <option value="">{t("transactions.allCategories")}</option>
            {masterData.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {suffix(category.isArchived)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("transactions.tag")}</span>
          <select
            className="input mt-1"
            value={filters.tagId ?? ""}
            onChange={(event) => update({ tagId: event.target.value || null })}
          >
            <option value="">{t("transactions.allTags")}</option>
            {masterData.tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
                {suffix(tag.isArchived)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("transactions.counterparty")}</span>
          <select
            className="input mt-1"
            value={filters.counterpartyId ?? ""}
            onChange={(event) => update({ counterpartyId: event.target.value || null })}
          >
            <option value="">{t("transactions.allCounterparties")}</option>
            {masterData.counterparties.map((counterparty) => (
              <option key={counterparty.id} value={counterparty.id}>
                {counterparty.name}
                {suffix(counterparty.isArchived)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("transactions.fromDay")}</span>
          <input
            type="date"
            className="input mt-1"
            value={filters.startDay}
            max={filters.endDay || undefined}
            onChange={(event) => update({ startDay: event.target.value })}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("transactions.toDay")}</span>
          <input
            type="date"
            className="input mt-1"
            value={filters.endDay}
            min={filters.startDay || undefined}
            onChange={(event) => update({ endDay: event.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
