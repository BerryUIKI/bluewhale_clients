import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountDto, AccountGroupDto } from "@bluewhale/ipc";
import {
  useAccountGroupUpdate,
  useAccountUpdate,
  useMasterData,
} from "../../lib/master-data-queries";
import { useActiveLedgerProfile } from "../../lib/ledger-queries";
import { AccountFormDialog } from "./account-form-dialog";
import { AccountGroupFormDialog } from "./account-group-form-dialog";
import { accountGroupUpdateRequest, accountUpdateRequest } from "./requests";
import { MasterDataBoundary, MasterDataErrorAlert, PageHeader, ShowArchived } from "./shared";

/** Lists accounts and their custom groups, with create, edit, and archive. */
export function AccountsPage() {
  const { t } = useTranslation();
  const query = useMasterData();
  const profile = useActiveLedgerProfile();
  const updateAccount = useAccountUpdate();
  const updateGroup = useAccountGroupUpdate();
  const [showArchived, setShowArchived] = useState(false);
  const [accountDialog, setAccountDialog] = useState<{ account: AccountDto | null } | null>(null);
  const [groupDialog, setGroupDialog] = useState<{ group: AccountGroupDto | null } | null>(null);

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("accounts.title")} subtitle={t("accounts.subtitle")}>
        <button
          type="button"
          className="button"
          onClick={() => setAccountDialog({ account: null })}
        >
          {t("accounts.newAccount")}
        </button>
      </PageHeader>

      <MasterDataBoundary query={query}>
        {(data) => {
          const groups = data.accountGroups;
          const groupById = new Map(groups.map((group) => [group.id, group]));
          const tagById = new Map(data.tags.map((tag) => [tag.id, tag]));
          const counterpartyById = new Map(
            data.counterparties.map((counterparty) => [counterparty.id, counterparty]),
          );
          const visibleAccounts = data.accounts.filter(
            (account) => showArchived || !account.isArchived,
          );
          const visibleGroups = groups.filter((group) => showArchived || !group.isArchived);

          return (
            <>
              {updateAccount.isError ? <MasterDataErrorAlert error={updateAccount.error} /> : null}
              {updateGroup.isError ? <MasterDataErrorAlert error={updateGroup.error} /> : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{t("accounts.listTitle")}</h2>
                <ShowArchived checked={showArchived} onChange={setShowArchived} />
              </div>

              {visibleAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line bg-surface p-6 text-center">
                  <p className="font-medium">{t("accounts.emptyTitle")}</p>
                  <p className="mt-1 text-sm text-muted">{t("accounts.emptyBody")}</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {visibleAccounts.map((account) => {
                    const group = account.customGroupId
                      ? groupById.get(account.customGroupId)
                      : undefined;
                    const owner = account.ownerId
                      ? counterpartyById.get(account.ownerId)
                      : undefined;
                    return (
                      <li key={account.id} className="rounded-lg border border-line bg-surface p-5">
                        <div className="flex flex-wrap items-start gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold">{account.name}</h3>
                              <span className="badge">
                                {t(`accounts.types.${account.assetType}`)}
                              </span>
                              <span className="badge">{account.currencyCode}</span>
                              {account.isHidden ? (
                                <span className="badge">{t("accounts.hiddenBadge")}</span>
                              ) : null}
                              {account.isArchived ? (
                                <span className="badge badge-danger">
                                  {t("masterData.archived")}
                                </span>
                              ) : null}
                            </div>
                            {group ? <p className="mt-1 text-xs text-muted">{group.name}</p> : null}
                            {account.tagIds.length > 0 ? (
                              <ul className="mt-2 flex flex-wrap gap-2">
                                {account.tagIds.map((tagId) => {
                                  const tag = tagById.get(tagId);
                                  if (!tag) {
                                    return null;
                                  }
                                  return (
                                    <li
                                      key={tagId}
                                      className="flex items-center gap-1.5 text-xs text-muted"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="inline-block size-2.5 rounded-full border border-line"
                                        style={{ backgroundColor: tag.colorHex }}
                                      />
                                      {tag.name}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                            {owner ? (
                              <p className="mt-1 text-xs text-muted">
                                {t("accounts.ownerLabel")}: {owner.name}
                              </p>
                            ) : null}
                            {account.note ? (
                              <p className="mt-2 text-sm text-muted">{account.note}</p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => setAccountDialog({ account })}
                            >
                              {t("masterData.edit")}
                            </button>
                            <button
                              type="button"
                              className="text-sm font-medium text-accent underline"
                              disabled={updateAccount.isPending}
                              onClick={() =>
                                updateAccount.mutate(
                                  accountUpdateRequest(account, !account.isArchived),
                                )
                              }
                            >
                              {account.isArchived
                                ? t("masterData.restore")
                                : t("masterData.archive")}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <section
                aria-labelledby="account-groups-heading"
                className="rounded-lg border border-line bg-surface p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 id="account-groups-heading" className="text-lg font-semibold">
                      {t("accounts.groupsTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{t("accounts.groupsSubtitle")}</p>
                  </div>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setGroupDialog({ group: null })}
                  >
                    {t("accounts.newGroup")}
                  </button>
                </div>

                {visibleGroups.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">{t("accounts.noGroups")}</p>
                ) : (
                  <ul className="mt-4 divide-y divide-line">
                    {visibleGroups.map((group) => (
                      <li
                        key={group.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{group.name}</span>
                          {group.isArchived ? (
                            <span className="badge badge-danger">{t("masterData.archived")}</span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => setGroupDialog({ group })}
                          >
                            {t("masterData.edit")}
                          </button>
                          <button
                            type="button"
                            className="text-sm font-medium text-accent underline"
                            disabled={updateGroup.isPending}
                            onClick={() =>
                              updateGroup.mutate(
                                accountGroupUpdateRequest(group, !group.isArchived),
                              )
                            }
                          >
                            {group.isArchived ? t("masterData.restore") : t("masterData.archive")}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {accountDialog ? (
                <AccountFormDialog
                  key={accountDialog.account?.id ?? "new"}
                  open
                  onOpenChange={(open) => {
                    if (!open) {
                      setAccountDialog(null);
                    }
                  }}
                  account={accountDialog.account}
                  groups={groups}
                  tags={data.tags}
                  counterparties={data.counterparties}
                  defaultCurrencyCode={profile.data?.currencyCode ?? "USD"}
                />
              ) : null}
              {groupDialog ? (
                <AccountGroupFormDialog
                  key={groupDialog.group?.id ?? "new"}
                  open
                  onOpenChange={(open) => {
                    if (!open) {
                      setGroupDialog(null);
                    }
                  }}
                  group={groupDialog.group}
                />
              ) : null}
            </>
          );
        }}
      </MasterDataBoundary>
    </section>
  );
}
