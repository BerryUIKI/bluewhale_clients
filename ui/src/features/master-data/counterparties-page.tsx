import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CounterpartyDto } from "@bluewhale/ipc";
import { useCounterpartyUpdate, useMasterData } from "../../lib/master-data-queries";
import { CounterpartyFormDialog } from "./counterparty-form-dialog";
import { counterpartyUpdateRequest } from "./requests";
import { MasterDataBoundary, MasterDataErrorAlert, PageHeader, ShowArchived } from "./shared";

/** Lists counterparties with their kind, create, edit, and archive. */
export function CounterpartiesPage() {
  const { t } = useTranslation();
  const query = useMasterData();
  const update = useCounterpartyUpdate();
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<{ counterparty: CounterpartyDto | null } | null>(null);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("counterparties.title")} subtitle={t("counterparties.subtitle")}>
        <button type="button" className="button" onClick={() => setDialog({ counterparty: null })}>
          {t("counterparties.newCounterparty")}
        </button>
      </PageHeader>

      <MasterDataBoundary query={query}>
        {(data) => {
          const visible = data.counterparties.filter(
            (counterparty) => showArchived || !counterparty.isArchived,
          );
          return (
            <>
              {update.isError ? <MasterDataErrorAlert error={update.error} /> : null}

              <div className="flex justify-end">
                <ShowArchived checked={showArchived} onChange={setShowArchived} />
              </div>

              {visible.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line bg-surface p-6 text-center">
                  <p className="font-medium">{t("counterparties.emptyTitle")}</p>
                  <p className="mt-1 text-sm text-muted">{t("counterparties.emptyBody")}</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {visible.map((counterparty) => (
                    <li
                      key={counterparty.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{counterparty.name}</h2>
                        <span className="badge">
                          {t(`counterparties.kinds.${counterparty.kind}`)}
                        </span>
                        {counterparty.isArchived ? (
                          <span className="badge badge-danger">{t("masterData.archived")}</span>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => setDialog({ counterparty })}
                        >
                          {t("masterData.edit")}
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-accent underline"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate(
                              counterpartyUpdateRequest(counterparty, !counterparty.isArchived),
                            )
                          }
                        >
                          {counterparty.isArchived
                            ? t("masterData.restore")
                            : t("masterData.archive")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {dialog ? (
                <CounterpartyFormDialog
                  key={dialog.counterparty?.id ?? "new"}
                  open
                  onOpenChange={(open) => {
                    if (!open) {
                      setDialog(null);
                    }
                  }}
                  counterparty={dialog.counterparty}
                />
              ) : null}
            </>
          );
        }}
      </MasterDataBoundary>
    </section>
  );
}
