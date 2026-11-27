import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { DashboardDto, MasterDataDto } from "@bluewhale/ipc";
import { ErrorAlert } from "../../components/error-alert";
import { useDashboard } from "../../lib/dashboard-queries";
import { formatMonth, ledgerMonth } from "../../lib/dates";
import { useActiveLedgerProfile, useLedgerList } from "../../lib/ledger-queries";
import { useMasterData } from "../../lib/master-data-queries";
import { MissingRateNotice } from "../dashboard/missing-rate-notice";
import { MoneyAmount } from "../dashboard/money-amount";
import { MonthSelector } from "../dashboard/month-selector";
import { TotalCard } from "../dashboard/total-card";
import { amountLabel, displayTime, formatLedgerDate } from "../transactions/transaction-format";

function formatDate(value: string, locale: string): string {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(instant);
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const ledgers = useLedgerList();
  const profile = useActiveLedgerProfile();
  const active = ledgers.data?.ledgers.find((ledger) => ledger.isActive);
  const [month, setMonth] = useState<string | null>(null);
  const timeZone = profile.data?.timeZoneIdentifier ?? "UTC";
  const selectedMonth = month ?? (profile.data ? ledgerMonth(timeZone) : "");
  const dashboard = useDashboard(selectedMonth);
  const master = useMasterData();

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("home.title")}</h1>
        <p className="text-muted">{t("home.subtitle")}</p>
      </header>

      {profile.isPending ? <p className="text-sm text-muted">{t("ledgers.loading")}</p> : null}

      {profile.data ? (
        <section
          aria-labelledby="active-ledger-heading"
          className="rounded-lg border border-line bg-surface p-6"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-3xl">
              {profile.data.emoji}
            </span>
            <h2 id="active-ledger-heading" className="text-xl font-semibold">
              {profile.data.name}
            </h2>
          </div>
          <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">{t("home.currency")}</dt>
            <dd className="font-mono">{profile.data.currencyCode}</dd>
            <dt className="text-muted">{t("home.timeZone")}</dt>
            <dd className="font-mono">{profile.data.timeZoneIdentifier}</dd>
            {active ? (
              <>
                <dt className="text-muted">{t("home.created")}</dt>
                <dd>{formatDate(active.createdAt, i18n.language)}</dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      {!profile.isPending && !profile.data && active?.status === "unavailable" ? (
        <section
          aria-labelledby="unavailable-heading"
          role="alert"
          className="space-y-2 rounded-lg border border-danger/40 bg-danger/10 p-6"
        >
          <h2 id="unavailable-heading" className="text-lg font-semibold text-danger">
            {t("home.ledgerUnavailableTitle")}
          </h2>
          <p className="text-sm text-danger">
            {t(`ledgers.unavailable.${active.unavailableReason ?? "unknown"}`)}
          </p>
          <p className="text-sm text-muted">{t("ledgers.recoveryHint")}</p>
          <Link className="inline-block text-sm font-medium text-accent underline" to="/ledgers">
            {t("home.manageLedgers")}
          </Link>
        </section>
      ) : null}

      {!profile.isPending && !profile.data && active?.status !== "unavailable" ? (
        <section className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
          <h2 className="text-lg font-semibold">{t("home.emptyTitle")}</h2>
          <p className="mt-2 text-muted">{t("home.emptyBody")}</p>
        </section>
      ) : null}

      {profile.data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("dashboard.title")}</h2>
            {selectedMonth !== "" ? (
              <MonthSelector
                month={selectedMonth}
                timeZoneIdentifier={timeZone}
                onChange={setMonth}
              />
            ) : null}
          </div>

          {dashboard.isError ? (
            <ErrorAlert error={dashboard.error} onRetry={() => void dashboard.refetch()} />
          ) : null}
          {selectedMonth === "" || dashboard.isPending ? (
            <p className="text-sm text-muted">{t("dashboard.loading")}</p>
          ) : null}
          {dashboard.data ? (
            <DashboardContent data={dashboard.data} masterData={master.data} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DashboardContent({
  data,
  masterData,
}: {
  data: DashboardDto;
  masterData: MasterDataDto | undefined;
}) {
  const { t, i18n } = useTranslation();
  const categories = new Map(masterData?.categories.map((category) => [category.id, category]));
  const accounts = new Map(masterData?.accounts.map((account) => [account.id, account]));
  const activeDays = data.days.filter((day) => day.transactions.length > 0);

  return (
    <div className="space-y-6">
      {data.missingRate ? <MissingRateNotice missingRate={data.missingRate} /> : null}

      <section aria-labelledby="balances-heading" className="space-y-3">
        <h2 id="balances-heading" className="text-lg font-semibold">
          {t("dashboard.balances")}
        </h2>
        {data.accountBalances.length === 0 ? (
          <p className="text-sm text-muted">{t("dashboard.noAccounts")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.accountBalances.map((balance) => (
              <li key={balance.accountId} className="rounded-lg border border-line bg-surface p-4">
                <p className="text-sm font-medium">{balance.accountName}</p>
                <p className="mt-1 text-xl font-semibold">
                  <MoneyAmount money={balance.balance} />
                </p>
              </li>
            ))}
            {data.netBalance ? (
              <li className="rounded-lg border border-line bg-surface p-4">
                <p className="text-sm font-medium">{t("dashboard.netBalance")}</p>
                <p className="mt-1 text-xl font-semibold">
                  <MoneyAmount money={data.netBalance} />
                </p>
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <section aria-labelledby="month-heading" className="space-y-3">
        <div>
          <h2 id="month-heading" className="text-lg font-semibold">
            {t("dashboard.monthTotals")}
          </h2>
          <p className="text-sm text-muted">{formatMonth(data.month, i18n.language)}</p>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <TotalCard label={t("dashboard.income")} money={data.monthlyIncome} />
          <TotalCard label={t("dashboard.expense")} money={data.monthlyExpense} />
          <TotalCard label={t("dashboard.savings")} money={data.monthlySavings} />
        </dl>
      </section>

      {data.missingRate ? null : (
        <section aria-labelledby="days-heading" className="space-y-3">
          <h2 id="days-heading" className="text-lg font-semibold">
            {t("dashboard.dailyCashFlow")}
          </h2>
          {activeDays.length === 0 ? (
            <p className="text-sm text-muted">{t("dashboard.noActivity")}</p>
          ) : (
            <div className="space-y-2">
              {activeDays.map((day) => (
                <details key={day.date} className="rounded-lg border border-line bg-surface p-4">
                  <summary className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                    <span>{formatLedgerDate(day.date, i18n.language)}</span>
                    <span className="text-xs font-normal text-muted">
                      {t("dashboard.income")} <MoneyAmount money={day.income} /> ·{" "}
                      {t("dashboard.expense")} <MoneyAmount money={day.expense} /> ·{" "}
                      {t("dashboard.savings")} <MoneyAmount money={day.savings} />
                    </span>
                  </summary>
                  <ul className="mt-3 space-y-1">
                    {day.transactions.map((entry) => {
                      const category = entry.categoryId
                        ? categories.get(entry.categoryId)
                        : undefined;
                      const account = accounts.get(entry.accountId);
                      const description =
                        entry.note ??
                        category?.name ??
                        account?.name ??
                        t(`transactions.kinds.${entry.kind}`);
                      return (
                        <li
                          key={entry.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-muted">{displayTime(entry.occurredAtLocal)}</span>
                          <span className="min-w-0 flex-1">{description}</span>
                          <span className="tabular-nums">{amountLabel(entry)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
