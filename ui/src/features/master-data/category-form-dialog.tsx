import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { CategoryDto, CategoryGroupDto, CategoryKindDto } from "@bluewhale/ipc";
import { useCategoryCreate, useCategoryUpdate } from "../../lib/master-data-queries";
import { FormActions, FormDialog, FormError, SelectField, TextField } from "./shared";

const categorySchema = z.object({
  name: z.string().trim().min(1, "categories.nameRequired").max(60, "categories.nameTooLong"),
  groupId: z.string(),
});

type CategoryValues = z.infer<typeof categorySchema>;

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  kind,
  groups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryDto | null;
  kind: CategoryKindDto;
  groups: CategoryGroupDto[];
}) {
  const { t } = useTranslation();
  const formId = useId();
  const resolver = useMemo(() => zodResolver(categorySchema), []);
  const create = useCategoryCreate();
  const update = useCategoryUpdate();
  const mutation = category ? update : create;

  const selectableGroups = groups.filter((group) => group.kind === kind && !group.isArchived);
  const currentGroup = groups.find((group) => group.id === category?.groupId);
  const groupIsArchived = currentGroup?.isArchived === true;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryValues>({
    resolver,
    defaultValues: {
      name: category?.name ?? "",
      groupId: currentGroup && !currentGroup.isArchived ? currentGroup.id : "",
    },
  });

  const submit = (values: CategoryValues) => {
    const groupId = values.groupId === "" ? null : values.groupId;
    if (category) {
      update.mutate(
        {
          id: category.id,
          name: values.name,
          groupId,
          isArchived: category.isArchived,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate({ name: values.name, kind, groupId }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? t("categories.editTitle") : t("categories.createTitle")}
      description={
        kind === "expense" ? t("categories.expenseDescription") : t("categories.incomeDescription")
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <TextField
          id={`${formId}-name`}
          label={t("categories.name")}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />
        <SelectField
          id={`${formId}-group`}
          label={t("categories.group")}
          hint={groupIsArchived ? "categories.archivedGroupHint" : undefined}
          {...register("groupId")}
        >
          <option value="">{t("categories.noGroup")}</option>
          {selectableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>
        {mutation.isError ? <FormError error={mutation.error} /> : null}
        <FormActions
          pending={mutation.isPending}
          submit={category ? t("masterData.save") : t("masterData.create")}
        />
      </form>
    </FormDialog>
  );
}
