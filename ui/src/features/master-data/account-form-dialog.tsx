import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { AccountDto, AccountGroupDto, CounterpartyDto, TagDto } from "@bluewhale/ipc";
import { useAccountCreate, useAccountUpdate } from "../../lib/master-data-queries";
import { CURRENCIES } from "../ledgers/options";
import {
  CheckboxField,
  FormActions,
  FormDialog,
  FormError,
  SelectField,
  TextAreaField,
  TextField,
} from "./shared";

const accountSchema = z.object({
  name: z.string().trim().min(1, "accounts.nameRequired").max(80, "accounts.nameTooLong"),
  assetType: z.enum(["cash", "checking", "savings", "stored_value"]),
  currencyCode: z.string().min(1),
  openingBalance: z.string().max(32, "accounts.amountTooLong"),
  customGroupId: z.string(),
  ownerId: z.string(),
  note: z.string().max(500, "accounts.noteTooLong"),
  isHidden: z.boolean(),
  isIncludedInNetWorth: z.boolean(),
});

type AccountValues = z.infer<typeof accountSchema>;

export function AccountFormDialog({
  open,
  onOpenChange,
  account,
  groups,
  tags,
  counterparties,
  defaultCurrencyCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountDto | null;
  groups: AccountGroupDto[];
  tags: TagDto[];
  counterparties: CounterpartyDto[];
  defaultCurrencyCode: string;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const resolver = useMemo(() => zodResolver(accountSchema), []);
  const create = useAccountCreate();
  const update = useAccountUpdate();
  const mutation = account ? update : create;

  const currentGroup = groups.find((group) => group.id === account?.customGroupId);
  const groupIsArchived = currentGroup?.isArchived === true;
  const selectableGroups = groups.filter((group) => !group.isArchived);
  const selectableTags = tags.filter(
    (tag) => !tag.isArchived || (account?.tagIds ?? []).includes(tag.id),
  );
  const selectableOwners = counterparties.filter(
    (counterparty) =>
      counterparty.kind === "household_member" &&
      (!counterparty.isArchived || counterparty.id === account?.ownerId),
  );

  const [tagIds, setTagIds] = useState<string[]>(account?.tagIds ?? []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountValues>({
    resolver,
    defaultValues: {
      name: account?.name ?? "",
      assetType: account?.assetType ?? "checking",
      currencyCode: account?.currencyCode ?? defaultCurrencyCode,
      openingBalance: "",
      customGroupId: currentGroup && !currentGroup.isArchived ? currentGroup.id : "",
      ownerId: account?.ownerId ?? "",
      note: account?.note ?? "",
      isHidden: account?.isHidden ?? false,
      isIncludedInNetWorth: account?.isIncludedInNetWorth ?? true,
    },
  });

  const toggleTag = (id: string, checked: boolean) => {
    setTagIds((current) => (checked ? [...current, id] : current.filter((entry) => entry !== id)));
  };

  const submit = (values: AccountValues) => {
    const shared = {
      name: values.name,
      assetType: values.assetType,
      tagIds,
      ownerId: values.ownerId === "" ? null : values.ownerId,
      customGroupId: values.customGroupId === "" ? null : values.customGroupId,
      note: values.note,
      isHidden: values.isHidden,
      isIncludedInNetWorth: values.isIncludedInNetWorth,
    };
    if (account) {
      update.mutate(
        { ...shared, id: account.id, isArchived: account.isArchived },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        {
          ...shared,
          currencyCode: values.currencyCode,
          openingBalanceText: values.openingBalance.trim() === "" ? null : values.openingBalance,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={account ? t("accounts.editTitle") : t("accounts.createTitle")}
      description={account ? t("accounts.editDescription") : t("accounts.createDescription")}
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <TextField
          id={`${formId}-name`}
          label={t("accounts.name")}
          placeholder={t("accounts.namePlaceholder")}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id={`${formId}-type`}
            label={t("accounts.assetType")}
            error={errors.assetType?.message}
            {...register("assetType")}
          >
            <option value="cash">{t("accounts.types.cash")}</option>
            <option value="checking">{t("accounts.types.checking")}</option>
            <option value="savings">{t("accounts.types.savings")}</option>
            <option value="stored_value">{t("accounts.types.stored_value")}</option>
          </SelectField>

          {account ? (
            <div>
              <span className="block text-sm font-medium">{t("accounts.currency")}</span>
              <p className="mt-2 font-mono text-sm">{account.currencyCode}</p>
              <p className="mt-1 text-xs text-muted">{t("accounts.currencyFixedHint")}</p>
            </div>
          ) : (
            <SelectField
              id={`${formId}-currency`}
              label={t("accounts.currency")}
              error={errors.currencyCode?.message}
              {...register("currencyCode")}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectField>
          )}
        </div>

        {account ? null : (
          <TextField
            id={`${formId}-opening`}
            label={t("accounts.openingBalance")}
            inputMode="decimal"
            autoComplete="off"
            hint="accounts.openingBalanceHint"
            error={errors.openingBalance?.message}
            {...register("openingBalance")}
          />
        )}

        <SelectField
          id={`${formId}-group`}
          label={t("accounts.group")}
          error={errors.customGroupId?.message}
          hint={groupIsArchived ? "accounts.archivedGroupHint" : undefined}
          {...register("customGroupId")}
        >
          <option value="">{t("masterData.none")}</option>
          {selectableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          id={`${formId}-owner`}
          label={t("accounts.owner")}
          error={errors.ownerId?.message}
          {...register("ownerId")}
        >
          <option value="">{t("masterData.none")}</option>
          {selectableOwners.map((counterparty) => (
            <option key={counterparty.id} value={counterparty.id}>
              {counterparty.name}
            </option>
          ))}
        </SelectField>

        <fieldset>
          <legend className="text-sm font-medium">{t("accounts.tags")}</legend>
          {selectableTags.length === 0 ? (
            <p className="mt-1 text-xs text-muted">{t("accounts.noTags")}</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {selectableTags.map((tag) => (
                <li key={tag.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={tagIds.includes(tag.id)}
                      onChange={(event) => toggleTag(tag.id, event.target.checked)}
                    />
                    <span
                      aria-hidden="true"
                      className="inline-block size-3 rounded-full border border-line"
                      style={{ backgroundColor: tag.colorHex }}
                    />
                    {tag.name}
                    {tag.isArchived ? (
                      <span className="text-xs text-muted">({t("masterData.archived")})</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <TextAreaField
          id={`${formId}-note`}
          label={t("accounts.note")}
          placeholder={t("accounts.notePlaceholder")}
          error={errors.note?.message}
          {...register("note")}
        />

        <div className="space-y-2">
          <CheckboxField
            id={`${formId}-hidden`}
            label={t("accounts.hidden")}
            {...register("isHidden")}
          />
          <CheckboxField
            id={`${formId}-net-worth`}
            label={t("accounts.includedInNetWorth")}
            {...register("isIncludedInNetWorth")}
          />
        </div>

        {mutation.isError ? <FormError error={mutation.error} /> : null}

        <FormActions
          pending={mutation.isPending}
          submit={account ? t("masterData.save") : t("masterData.create")}
        />
      </form>
    </FormDialog>
  );
}
