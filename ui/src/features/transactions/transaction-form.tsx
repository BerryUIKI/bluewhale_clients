import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import type { MasterDataDto, TransactionDto, TransactionKindDto } from "@bluewhale/ipc";
import { ErrorAlert } from "../../components/error-alert";
import { useCreateTransaction, useUpdateTransaction } from "../../lib/transaction-queries";
import { ledgerNowLocal } from "../../lib/dates";
import { SelectField, TextAreaField, TextField } from "../master-data/shared";

type EditableKind = "expense" | "income" | "transfer";

const transactionSchema = z
  .object({
    kind: z.enum(["expense", "income", "transfer"]),
    amountText: z.string().trim().min(1, "transactions.amountRequired"),
    occurredDate: z.string().min(1, "transactions.dateRequired"),
    occurredTime: z.string().min(1, "transactions.timeRequired"),
    accountId: z.string().min(1, "transactions.accountRequired"),
    destinationAccountId: z.string(),
    destinationAmountText: z.string(),
    categoryId: z.string(),
    counterpartyId: z.string(),
    note: z.string().max(500, "transactions.noteTooLong"),
  })
  .superRefine((values, context) => {
    if (values.kind !== "transfer" && values.categoryId === "") {
      context.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "transactions.categoryRequired",
      });
    }
    if (values.kind === "transfer" && values.destinationAccountId === "") {
      context.addIssue({
        code: "custom",
        path: ["destinationAccountId"],
        message: "transactions.destinationRequired",
      });
    }
  });

type TransactionValues = z.infer<typeof transactionSchema>;

function editableKind(kind: TransactionKindDto | undefined): EditableKind {
  if (kind === "income" || kind === "transfer") {
    return kind;
  }
  return "expense";
}

/** The create and edit form for a transaction. */
export function TransactionForm({
  transaction,
  masterData,
  timeZoneIdentifier,
}: {
  transaction: TransactionDto | null;
  masterData: MasterDataDto;
  timeZoneIdentifier: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const formId = useId();
  const resolver = useMemo(() => zodResolver(transactionSchema), []);
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const mutation = transaction ? update : create;

  const activeAccounts = masterData.accounts.filter((account) => !account.isArchived);
  const currentAccount = masterData.accounts.find(
    (account) => account.id === transaction?.accountId,
  );
  const currentCategory = masterData.categories.find(
    (category) => category.id === transaction?.categoryId,
  );
  const currentDestination = masterData.accounts.find(
    (account) => account.id === transaction?.destinationAccountId,
  );
  const currentCounterparty = masterData.counterparties.find(
    (counterparty) => counterparty.id === transaction?.counterpartyId,
  );
  const archivedTagCount = (transaction?.tagIds ?? []).filter((id) =>
    masterData.tags.some((tag) => tag.id === id && tag.isArchived),
  ).length;

  const local = transaction?.occurredAtLocal ?? ledgerNowLocal(timeZoneIdentifier);
  const [defaultDate, defaultTime] = local.split("T");
  const defaultKind = editableKind(transaction?.kind);
  const defaultAccount = transaction
    ? currentAccount?.isArchived
      ? ""
      : transaction.accountId
    : (activeAccounts[0]?.id ?? "");
  const defaultCategory =
    transaction && !currentCategory?.isArchived
      ? (transaction.categoryId ?? "")
      : defaultKind === "transfer"
        ? ""
        : currentCategory?.isArchived
          ? ""
          : (transaction?.categoryId ?? "");
  const defaultDestination =
    transaction && !currentDestination?.isArchived ? (transaction.destinationAccountId ?? "") : "";
  const defaultCounterparty =
    transaction && !currentCounterparty?.isArchived ? (transaction.counterpartyId ?? "") : "";

  const [tagIds, setTagIds] = useState<string[]>(
    (transaction?.tagIds ?? []).filter((id) =>
      masterData.tags.some((tag) => tag.id === id && !tag.isArchived),
    ),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<TransactionValues>({
    resolver,
    defaultValues: {
      kind: defaultKind,
      amountText: transaction?.amountText ?? "",
      occurredDate: defaultDate ?? "",
      occurredTime: defaultTime ?? "",
      accountId: defaultAccount,
      destinationAccountId: defaultDestination,
      destinationAmountText: transaction?.destinationAmountText ?? "",
      categoryId: defaultCategory,
      counterpartyId: defaultCounterparty,
      note: transaction?.note ?? "",
    },
  });

  const kind = watch("kind");
  const accountId = watch("accountId");
  const destinationAccountId = watch("destinationAccountId");
  const previousKind = useRef<EditableKind>(kind);

  useEffect(() => {
    if (previousKind.current !== kind) {
      previousKind.current = kind;
      setValue("categoryId", "");
      setValue("counterpartyId", "");
      if (kind !== "transfer") {
        setValue("destinationAccountId", "");
        setValue("destinationAmountText", "");
      }
    }
  }, [kind, setValue]);

  useEffect(() => {
    if (destinationAccountId !== "" && destinationAccountId === accountId) {
      setValue("destinationAccountId", "");
      setValue("destinationAmountText", "");
    }
  }, [accountId, destinationAccountId, setValue]);

  const source = masterData.accounts.find((account) => account.id === accountId);
  const destination = masterData.accounts.find((account) => account.id === destinationAccountId);
  const transfer = kind === "transfer";
  const categorized = kind === "expense" || kind === "income";
  const crossCurrency =
    transfer && source !== undefined && destination !== undefined
      ? source.currencyCode !== destination.currencyCode
      : false;
  const categoryOptions = masterData.categories.filter(
    (category) => !category.isArchived && category.kind === kind,
  );
  const destinationOptions = activeAccounts.filter((account) => account.id !== accountId);
  const counterpartyOptions = masterData.counterparties.filter(
    (counterparty) => !counterparty.isArchived,
  );
  const tagOptions = masterData.tags.filter(
    (tag) => !tag.isArchived || (transaction?.tagIds ?? []).includes(tag.id),
  );

  const submit = (values: TransactionValues) => {
    if (transfer && crossCurrency && values.destinationAmountText.trim() === "") {
      setError("destinationAmountText", {
        message: "transactions.destinationAmountRequired",
      });
      return;
    }
    const occurredAt = `${values.occurredDate}T${values.occurredTime}`;
    const base = {
      kind: values.kind,
      amountText: values.amountText,
      destinationAmountText:
        transfer && crossCurrency && values.destinationAmountText.trim() !== ""
          ? values.destinationAmountText
          : null,
      occurredAt,
      accountId: values.accountId,
      destinationAccountId:
        transfer && values.destinationAccountId !== "" ? values.destinationAccountId : null,
      categoryId: categorized && values.categoryId !== "" ? values.categoryId : null,
      tagIds,
      counterpartyId: categorized && values.counterpartyId !== "" ? values.counterpartyId : null,
      note: values.note.trim() === "" ? null : values.note,
    };
    const onSuccess = () =>
      navigate("/transactions", {
        replace: true,
        state: { status: transaction ? "updated" : "created" },
      });
    if (transaction) {
      update.mutate({ ...base, id: transaction.id }, { onSuccess });
    } else {
      create.mutate(base, { onSuccess });
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`${formId}-kind`}
          label={t("transactions.kind")}
          error={errors.kind?.message}
          {...register("kind")}
        >
          <option value="expense">{t("transactions.kinds.expense")}</option>
          <option value="income">{t("transactions.kinds.income")}</option>
          <option value="transfer">{t("transactions.kinds.transfer")}</option>
        </SelectField>
        <TextField
          id={`${formId}-amount`}
          label={
            source
              ? t("transactions.amountWithCurrency", { currency: source.currencyCode })
              : t("transactions.amount")
          }
          inputMode="decimal"
          autoComplete="off"
          hint="transactions.amountHint"
          error={errors.amountText?.message}
          {...register("amountText")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${formId}-date`}
          label={t("transactions.date")}
          type="date"
          error={errors.occurredDate?.message}
          {...register("occurredDate")}
        />
        <TextField
          id={`${formId}-time`}
          label={t("transactions.time")}
          type="time"
          error={errors.occurredTime?.message}
          {...register("occurredTime")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`${formId}-account`}
          label={t("transactions.account")}
          hint={currentAccount?.isArchived ? "transactions.archivedAccountHint" : undefined}
          error={errors.accountId?.message}
          {...register("accountId")}
        >
          <option value="">{t("transactions.chooseAccount")}</option>
          {activeAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currencyCode}
            </option>
          ))}
        </SelectField>

        {transfer ? (
          <SelectField
            id={`${formId}-destination`}
            label={t("transactions.destinationAccount")}
            hint={
              currentDestination?.isArchived ? "transactions.archivedDestinationHint" : undefined
            }
            error={errors.destinationAccountId?.message}
            {...register("destinationAccountId")}
          >
            <option value="">{t("transactions.chooseDestination")}</option>
            {destinationOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currencyCode}
              </option>
            ))}
          </SelectField>
        ) : (
          <SelectField
            id={`${formId}-category`}
            label={t("transactions.category")}
            hint={currentCategory?.isArchived ? "transactions.archivedCategoryHint" : undefined}
            error={errors.categoryId?.message}
            {...register("categoryId")}
          >
            <option value="">{t("transactions.chooseCategory")}</option>
            {categoryOptions.map((category) => {
              const group = category.groupId
                ? masterData.categoryGroups.find((entry) => entry.id === category.groupId)
                : undefined;
              return (
                <option key={category.id} value={category.id}>
                  {group ? `${group.name} · ${category.name}` : category.name}
                </option>
              );
            })}
          </SelectField>
        )}
      </div>

      {transfer && crossCurrency ? (
        <TextField
          id={`${formId}-destination-amount`}
          label={t("transactions.destinationAmountWithCurrency", {
            currency: destination?.currencyCode ?? "",
          })}
          inputMode="decimal"
          autoComplete="off"
          hint="transactions.destinationAmountHint"
          error={errors.destinationAmountText?.message}
          {...register("destinationAmountText")}
        />
      ) : null}

      {categorized ? (
        <SelectField
          id={`${formId}-counterparty`}
          label={t("transactions.counterparty")}
          hint={
            currentCounterparty?.isArchived ? "transactions.archivedCounterpartyHint" : undefined
          }
          error={errors.counterpartyId?.message}
          {...register("counterpartyId")}
        >
          <option value="">{t("masterData.none")}</option>
          {counterpartyOptions.map((counterparty) => (
            <option key={counterparty.id} value={counterparty.id}>
              {counterparty.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      <fieldset>
        <legend className="text-sm font-medium">{t("transactions.tags")}</legend>
        {tagOptions.length === 0 ? (
          <p className="mt-1 text-xs text-muted">{t("transactions.noTags")}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {tagOptions.map((tag) => (
              <li key={tag.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={tagIds.includes(tag.id)}
                    onChange={(event) =>
                      setTagIds((current) =>
                        event.target.checked
                          ? [...current, tag.id]
                          : current.filter((id) => id !== tag.id),
                      )
                    }
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
        {archivedTagCount > 0 ? (
          <p className="mt-1 text-xs text-muted">{t("transactions.archivedTagsHint")}</p>
        ) : null}
      </fieldset>

      <TextAreaField
        id={`${formId}-note`}
        label={t("transactions.note")}
        placeholder={t("transactions.notePlaceholder")}
        error={errors.note?.message}
        {...register("note")}
      />

      {mutation.isError ? <ErrorAlert error={mutation.error} /> : null}

      <div className="flex items-center justify-end gap-3">
        <Link to="/transactions" className="button button-secondary">
          {t("masterData.cancel")}
        </Link>
        <button type="submit" className="button" disabled={mutation.isPending}>
          {mutation.isPending
            ? t("masterData.saving")
            : transaction
              ? t("masterData.save")
              : t("masterData.create")}
        </button>
      </div>
    </form>
  );
}
