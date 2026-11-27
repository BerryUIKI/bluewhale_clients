import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryKindDto, CategoryRankingDto } from "@bluewhale/ipc";
import { ErrorAlert } from "../../components/error-alert";
import { useCategoryRanking, useDashboard } from "../../lib/dashboard-queries";
import { formatMonth, ledgerMonth } from "../../lib/dates";
import { useActiveLedgerProfile } from "../../lib/ledger-queries";
import { MissingRateNotice } from "../dashboard/missing-rate-notice";
import { MoneyAmount } from "../dashboard/money-amount";
import { MonthSelector } from "../dashboard/month-selector";
import { TotalCard } from "../dashboard/total-card";

/** Cash-flow summary and category ranking for a ledger month. */
export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const profile = useActiveLedgerProfile();
  const [month, setMonth] = useState<string | null>(null);
  const [kind, setKind] = useState<CategoryKindDto>("expense");
  const timeZone = profile.data?.timeZoneIdentifier ?? "UTC";
  const selectedMonth = month ?? (profile.data ? ledgerMonth(timeZone) : "");
  const dashboard = useDashboard(selectedMonth);
  const ranking = useCategoryRanking(selectedMonth, kind);
  const loading = selectedMonth === "" || dashboard.isPending || ranking.isPending;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("reports.title")}</h1>
          <p className="text-muted">{t("reports.subtitle")}</p>
        </div>
        {selectedMonth !== "" ? (
          <MonthSelector month={selectedMonth} timeZoneIdentifier={timeZone} onChange={setMonth} />
        ) : null}
      </header>

      {dashboard.isError ? (
        <ErrorAlert error={dashboard.error} onRetry={() => void dashboard.refetch()} />
      ) : null}
      {ranking.isError ? (
        <ErrorAlert error={ranking.error} onRetry={() => void ranking.refetch()} />
      ) : null}
      {loading ? <p className="text-sm text-muted">{t("reports.loading")}</p> : null}

      <section aria-labelledby="cash-flow-heading" className="space-y-3">
        <div>
          <h2 id="cash-flow-heading" className="text-lg font-semibold">
            {t("reports.cashFlow")}
          </h2>
          <p className="text-sm text-muted">
            {t("reports.cashFlowSubtitle")}{" "}
            {selectedMonth !== "" ? formatMonth(selectedMonth, i18n.language) : ""}
          </p>
        </div>
        {dashboard.data?.missingRate ? (
          <MissingRateNotice
            missingRate={dashboard.data.missingRate}
            scope={t("reports.cashFlow")}
          />
        ) : null}
        {dashboard.data ? (
          <dl className="grid gap-3 sm:grid-cols-3">
            <TotalCard label={t("dashboard.income")} money={dashboard.data.monthlyIncome} />
            <TotalCard label={t("dashboard.expense")} money={dashboard.data.monthlyExpense} />
            <TotalCard label={t("dashboard.savings")} money={dashboard.data.monthlySavings} />
          </dl>
        ) : null}
      </section>

      <section aria-labelledby="ranking-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="ranking-heading" className="text-lg font-semibold">
              {t("reports.categoryRanking")}
            </h2>
            <p className="text-sm text-muted">{t("reports.categoryRankingSubtitle")}</p>
          </div>
          <label className="text-sm">
            <span className="block font-medium">{t("reports.kind")}</span>
            <select
              className="input mt-1"
              value={kind}
              onChange={(event) => setKind(event.target.value as CategoryKindDto)}
            >
              <option value="expense">{t("reports.expense")}</option>
              <option value="income">{t("reports.income")}</option>
            </select>
          </label>
        </div>

        {ranking.data?.missingRate ? (
          <MissingRateNotice
            missingRate={ranking.data.missingRate}
            scope={t("reports.categoryRanking")}
          />
        ) : null}
        {ranking.data && !ranking.data.missingRate ? (
          ranking.data.rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-surface p-6 text-center">
              <p className="font-medium">{t("reports.noRankingTitle")}</p>
              <p className="mt-1 text-sm text-muted">{t("reports.noRankingBody")}</p>
            </div>
          ) : (
            <RankingTable data={ranking.data} />
          )
        ) : null}
      </section>
    </section>
  );
}

function RankingTable({ data }: { data: CategoryRankingDto }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface p-4">
      <table className="w-full text-sm">
        <caption className="sr-only">{t("reports.categoryRanking")}</caption>
        <thead>
          <tr className="border-b border-line text-left text-muted">
            <th className="py-2 pr-3 font-medium">{t("reports.rank")}</th>
            <th className="py-2 pr-3 font-medium">{t("reports.category")}</th>
            <th className="py-2 pr-3 text-right font-medium">{t("reports.transactions")}</th>
            <th className="py-2 text-right font-medium">{t("reports.total")}</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, index) => (
            <tr key={row.categoryId} className="border-b border-line/60">
              <td className="py-2 pr-3 tabular-nums text-muted">{index + 1}</td>
              <td className="py-2 pr-3">
                {row.groupName ? `${row.groupName} · ` : ""}
                {row.categoryName}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{row.transactionCount}</td>
              <td className="py-2 text-right">
                <MoneyAmount money={row.total} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 text-right font-medium">
              {t("reports.grandTotal")}
            </td>
            <td className="pt-3 text-right font-semibold">
              <MoneyAmount money={data.total} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
