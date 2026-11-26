import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { LedgerSummaryDto } from "@bluewhale/ipc";
import { errorMessageKey, errorPath } from "../../lib/errors";
import { useLedgerList, useRemoveLedger, useSwitchLedger } from "../../lib/ledger-queries";

/** Lists every ledger on this device with open, retry, and remove actions. */
export function LedgerListPage() {
  const { t } = useTranslation();
  const ledgers = useLedgerList();
  const switchLedger = useSwitchLedger();
  const removeLedger = useRemoveLedger();
  const [confirming, setConfirming] = useState<LedgerSummaryDto | null>(null);
  const [removedName, setRemovedName] = useState<string | null>(null);

  const switchPath = errorPath(switchLedger.error);
  const removePath = errorPath(removeLedger.error);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("ledgers.title")}</h1>
          <p className="text-muted">{t("ledgers.subtitle")}</p>
        </div>
        <Link to="/ledgers/new" className="button">
          {t("ledgers.newLedger")}
        </Link>
      </header>

      {removedName ? (
        <p role="status" className="rounded-md border border-line bg-surface p-3 text-sm">
          {t("ledgers.removed", { name: removedName })}
        </p>
      ) : null}

      {switchLedger.isError ? (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
          <p className="font-medium text-danger">
            {t("ledgers.switchFailed")} {t(errorMessageKey(switchLedger.error))}
          </p>
          {switchPath ? <p className="mt-1 font-mono text-xs break-all">{switchPath}</p> : null}
        </div>
      ) : null}

      {removeLedger.isError ? (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
          <p className="font-medium text-danger">{t(errorMessageKey(removeLedger.error))}</p>
          {removePath ? <p className="mt-1 font-mono text-xs break-all">{removePath}</p> : null}
        </div>
      ) : null}

      <ul className="space-y-3">
        {(ledgers.data?.ledgers ?? []).map((ledger) => (
          <li key={ledger.id} className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start gap-4">
              <span aria-hidden="true" className="text-2xl">
                {ledger.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">{ledger.name}</h2>
                  {ledger.isActive ? <span className="badge">{t("ledgers.active")}</span> : null}
                  {ledger.status === "unavailable" ? (
                    <span className="badge badge-danger">{t("ledgers.unavailableTitle")}</span>
                  ) : null}
                </div>
                {ledger.status === "unavailable" ? (
                  <div className="mt-2 text-sm">
                    <p className="text-danger">
                      {t(`ledgers.unavailable.${ledger.unavailableReason ?? "unknown"}`)}
                    </p>
                    <p className="mt-1 text-muted">{t("ledgers.recoveryHint")}</p>
                  </div>
                ) : null}
                <p className="mt-2 text-xs break-all text-muted">
                  {t("ledgers.dataPath")}: <span className="font-mono">{ledger.dataPath}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {!ledger.isActive && ledger.status === "available" ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={switchLedger.isPending}
                    onClick={() => switchLedger.mutate(ledger.id)}
                  >
                    {t("ledgers.open")}
                  </button>
                ) : null}
                {ledger.status === "unavailable" ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={switchLedger.isPending}
                    onClick={() => switchLedger.mutate(ledger.id)}
                  >
                    {t("ledgers.retry")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="text-sm font-medium text-danger underline"
                  onClick={() => setConfirming(ledger)}
                >
                  {t("ledgers.remove")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

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
              {t("ledgers.removeTitle")}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted">
              {t("ledgers.removeBody")}
            </AlertDialog.Description>
            {confirming ? (
              <p className="mt-3 text-xs break-all text-muted">
                {t("ledgers.dataPath")}: <span className="font-mono">{confirming.dataPath}</span>
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button type="button" className="button button-secondary">
                  {t("ledgers.removeCancel")}
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => {
                    if (confirming) {
                      const removed = confirming;
                      removeLedger.mutate(removed.id, {
                        onSuccess: () => {
                          setRemovedName(removed.name);
                          setConfirming(null);
                        },
                      });
                    }
                  }}
                >
                  {t("ledgers.removeConfirm")}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
