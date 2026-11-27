import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { TagDto } from "@bluewhale/ipc";
import { useTagCreate, useTagUpdate } from "../../lib/master-data-queries";
import { FormActions, FormDialog, FormError, TextAreaField, TextField } from "./shared";

const tagSchema = z.object({
  name: z.string().trim().min(1, "tags.nameRequired").max(40, "tags.nameTooLong"),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "tags.colorInvalid"),
  description: z.string().max(200, "tags.descriptionTooLong"),
});

type TagValues = z.infer<typeof tagSchema>;

export function TagFormDialog({
  open,
  onOpenChange,
  tag,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag: TagDto | null;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const resolver = useMemo(() => zodResolver(tagSchema), []);
  const create = useTagCreate();
  const update = useTagUpdate();
  const mutation = tag ? update : create;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<TagValues>({
    resolver,
    defaultValues: {
      name: tag?.name ?? "",
      colorHex: tag?.colorHex ?? "#3B82F6",
      description: tag?.description ?? "",
    },
  });
  const color = watch("colorHex");

  const submit = (values: TagValues) => {
    const description = values.description.trim() === "" ? null : values.description;
    if (tag) {
      update.mutate(
        {
          id: tag.id,
          name: values.name,
          colorHex: values.colorHex,
          description,
          isArchived: tag.isArchived,
        },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        { name: values.name, colorHex: values.colorHex, description },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tag ? t("tags.editTitle") : t("tags.createTitle")}
      description={t("tags.formDescription")}
    >
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        <TextField
          id={`${formId}-name`}
          label={t("tags.name")}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />
        <div>
          <label htmlFor={`${formId}-color`} className="block text-sm font-medium">
            {t("tags.color")}
          </label>
          <div className="mt-1 flex items-center gap-3">
            <input
              id={`${formId}-color`}
              type="color"
              className="h-10 w-16 cursor-pointer rounded-md border border-line bg-canvas p-1"
              aria-invalid={errors.colorHex ? true : undefined}
              aria-describedby={errors.colorHex ? `${formId}-color-error` : undefined}
              {...register("colorHex")}
            />
            <span className="font-mono text-sm text-muted">{color}</span>
          </div>
          {errors.colorHex ? (
            <p id={`${formId}-color-error`} role="alert" className="mt-1 text-sm text-danger">
              {t(errors.colorHex.message ?? "errors.internal")}
            </p>
          ) : null}
        </div>
        <TextAreaField
          id={`${formId}-description`}
          label={t("tags.description")}
          placeholder={t("tags.descriptionPlaceholder")}
          error={errors.description?.message}
          {...register("description")}
        />
        {mutation.isError ? <FormError error={mutation.error} /> : null}
        <FormActions
          pending={mutation.isPending}
          submit={tag ? t("masterData.save") : t("masterData.create")}
        />
      </form>
    </FormDialog>
  );
}
