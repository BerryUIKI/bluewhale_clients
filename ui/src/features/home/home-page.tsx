import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useActiveLedgerProfile, useLedgerList } from "../../lib/ledger-queries";

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
    </section>
  );
}
