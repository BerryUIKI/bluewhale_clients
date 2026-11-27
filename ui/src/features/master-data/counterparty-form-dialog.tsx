import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { CounterpartyDto } from "@bluewhale/ipc";
import { useCounterpartyCreate, useCounterpartyUpdate } from "../../lib/master-data-queries";
import { FormActions, FormDialog, FormError, SelectField, TextField } from "./shared";

const counterpartySchema = z.object({
  kind: z.enum(["household_member", "person", "organization"]),
  name: z
    .string()
    .trim()
    .min(1, "counterparties.nameRequired")
    .max(80, "counterparties.nameTooLong"),
});

type CounterpartyValues = z.infer<typeof counterpartySchema>;

export function CounterpartyFormDialog({
  open,
  onOpenChange,
  counterparty,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterparty: CounterpartyDto | null;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const resolver = useMemo(() => zodResolver(counterpartySchema), []);
  const create = useCounterpartyCreate();
  const update = useCounterpartyUpdate();
  const mutation = counterparty ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CounterpartyValues>({
    resolver,
    defaultValues: {
      kind: counterparty?.kind ?? "person",
      name: counterparty?.name ?? "",
    },
  });

  const submit = (values: CounterpartyValues) => {
    if (counterparty) {
      update.mutate(
        {
          id: counterparty.id,
          kind: values.kind,
          name: values.name,
          isArchived: counterparty.isArchived,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        { kind: values.kind, name: values.name },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={counterparty ? t("counterparties.editTitle") : t("counterparties.createTitle")}
      description={t("counterparties.formDescription")}
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <SelectField
          id={`${formId}-kind`}
          label={t("counterparties.kind")}
          error={errors.kind?.message}
          {...register("kind")}
        >
          <option value="household_member">{t("counterparties.kinds.household_member")}</option>
          <option value="person">{t("counterparties.kinds.person")}</option>
          <option value="organization">{t("counterparties.kinds.organization")}</option>
        </SelectField>
        <TextField
          id={`${formId}-name`}
          label={t("counterparties.name")}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />
        {mutation.isError ? <FormError error={mutation.error} /> : null}
        <FormActions
          pending={mutation.isPending}
          submit={counterparty ? t("masterData.save") : t("masterData.create")}
        />
      </form>
    </FormDialog>
  );
}
