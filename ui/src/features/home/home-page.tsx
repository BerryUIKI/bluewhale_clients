import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { errorMessageKey, isUnavailable } from "../../lib/errors";
import { useIpc } from "../../lib/ipc-context";

export function HomePage() {
  const { t } = useTranslation();
  const ipc = useIpc();
  const runtime = useQuery({ queryKey: ["app", "info"], queryFn: () => ipc.appInfo() });

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("home.title")}</h1>
        <p className="text-muted">{t("home.subtitle")}</p>
      </header>

      <section
        aria-labelledby="runtime-heading"
        className="rounded-lg border border-line bg-surface p-6"
      >
        <h2
          id="runtime-heading"
          className="text-xs font-semibold tracking-wide text-muted uppercase"
        >
          {t("home.runtimeTitle")}
        </h2>
        <div className="mt-4 text-sm" aria-live="polite">
          {runtime.isPending ? <p className="text-muted">{t("home.runtimeLoading")}</p> : null}
          {runtime.isError ? (
            <div role="alert" className="space-y-1">
              <p className="font-medium text-danger">{t(errorMessageKey(runtime.error))}</p>
              {isUnavailable(runtime.error) ? (
                <p className="text-muted">{t("home.runtimeUnavailableHint")}</p>
              ) : null}
            </div>
          ) : null}
          {runtime.data ? (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
              <dt className="text-muted">{t("home.version")}</dt>
              <dd className="font-mono">{runtime.data.version}</dd>
              <dt className="text-muted">{t("home.platform")}</dt>
              <dd className="font-mono">
                {runtime.data.os} / {runtime.data.arch}
              </dd>
            </dl>
          ) : null}
        </div>
      </section>

      <section
        aria-labelledby="ledger-heading"
        className="rounded-lg border border-dashed border-line bg-surface p-8 text-center"
      >
        <h2 id="ledger-heading" className="text-lg font-semibold">
          {t("home.emptyTitle")}
        </h2>
        <p className="mt-2 text-muted">{t("home.emptyBody")}</p>
      </section>
    </section>
  );
}
