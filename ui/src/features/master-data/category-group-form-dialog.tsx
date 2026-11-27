import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { CategoryGroupDto, CategoryKindDto } from "@bluewhale/ipc";
import { useCategoryGroupCreate, useCategoryGroupUpdate } from "../../lib/master-data-queries";
import { FormActions, FormDialog, FormError, TextField } from "./shared";

const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "categories.groupNameRequired")
    .max(60, "categories.groupNameTooLong"),
});

type GroupValues = z.infer<typeof groupSchema>;

export function CategoryGroupFormDialog({
  open,
  onOpenChange,
  group,
  kind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: CategoryGroupDto | null;
  kind: CategoryKindDto;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const resolver = useMemo(() => zodResolver(groupSchema), []);
  const create = useCategoryGroupCreate();
  const update = useCategoryGroupUpdate();
  const mutation = group ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupValues>({
    resolver,
    defaultValues: { name: group?.name ?? "" },
  });

  const submit = (values: GroupValues) => {
    if (group) {
      update.mutate(
        { id: group.id, name: values.name, isArchived: group.isArchived },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate({ name: values.name, kind }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={group ? t("categories.editGroupTitle") : t("categories.createGroupTitle")}
      description={t("categories.groupDescription")}
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <TextField
          id={`${formId}-name`}
          label={t("categories.groupName")}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />
        {mutation.isError ? <FormError error={mutation.error} /> : null}
        <FormActions
          pending={mutation.isPending}
          submit={group ? t("masterData.save") : t("masterData.create")}
        />
      </form>
    </FormDialog>
  );
}
