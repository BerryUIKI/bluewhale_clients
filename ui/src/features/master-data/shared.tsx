import * as Dialog from "@radix-ui/react-dialog";
import type { UseQueryResult } from "@tanstack/react-query";
import { useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useTranslation } from "react-i18next";
import type { MasterDataDto } from "@bluewhale/ipc";
import { errorMessageKey } from "../../lib/errors";

/** A page title with an optional action area. */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted">{subtitle}</p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

/** Renders the loading, failure, and empty states around the master data. */
export function MasterDataBoundary({
  query,
  children,
}: {
  query: UseQueryResult<MasterDataDto, Error>;
  children: (data: MasterDataDto) => ReactNode;
}) {
  const { t } = useTranslation();
  if (query.isPending) {
    return <p className="text-sm text-muted">{t("masterData.loading")}</p>;
  }
  if (query.isError) {
    return <MasterDataErrorAlert error={query.error} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) {
    return null;
  }
  return <>{children(query.data)}</>;
}

/** Shows a localized command failure with an optional retry action. */
export function MasterDataErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
      <p className="font-medium text-danger">{t(errorMessageKey(error))}</p>
      {onRetry ? (
        <button type="button" className="button button-secondary mt-3" onClick={onRetry}>
          {t("masterData.retry")}
        </button>
      ) : null}
    </div>
  );
}

/** The archived-records toggle shared by the master-data pages. */
export function ShowArchived({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-muted">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {t("masterData.showArchived")}
    </label>
  );
}

/** A modal dialog that hosts a create or edit form. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-line bg-surface p-6 shadow-xl">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
          <div className="mt-5">{children}</div>
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute top-3 right-3 rounded p-1 text-lg leading-none text-muted hover:text-ink"
              aria-label={t("masterData.close")}
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The cancel and submit actions shared by the dialog forms. */
export function FormActions({ pending, submit }: { pending: boolean; submit: string }) {
  const { t } = useTranslation();
  return (
    <div className="mt-6 flex justify-end gap-3">
      <Dialog.Close asChild>
        <button type="button" className="button button-secondary">
          {t("masterData.cancel")}
        </button>
      </Dialog.Close>
      <button type="submit" className="button" disabled={pending}>
        {pending ? t("masterData.saving") : submit}
      </button>
    </div>
  );
}

/** Shows a command failure inside a dialog form. */
export function FormError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">
      <p className="font-medium text-danger">{t(errorMessageKey(error))}</p>
    </div>
  );
}

type FieldBase = {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) {
    return `${id}-error`;
  }
  if (hint) {
    return `${id}-hint`;
  }
  return undefined;
}

function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  const { t } = useTranslation();
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">
        {t(error)}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
        {t(hint)}
      </p>
    );
  }
  return null;
}

/** A labeled text input with inline validation feedback. */
export function TextField({
  id,
  label,
  error,
  hint,
  ...input
}: FieldBase & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className="input mt-1"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...input}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

/** A labeled select with inline validation feedback. */
export function SelectField({
  id,
  label,
  error,
  hint,
  children,
  ...select
}: FieldBase & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className="input mt-1"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...select}
      >
        {children}
      </select>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

/** A labeled text area with inline validation feedback. */
export function TextAreaField({
  id,
  label,
  error,
  hint,
  ...textarea
}: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        className="input mt-1"
        rows={2}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...textarea}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

/** A labeled checkbox. */
export function CheckboxField({
  id,
  label,
  hint,
  ...input
}: {
  id: string;
  label: string;
  hint?: string | undefined;
} & InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...input}
        />
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {t(hint)}
        </p>
      ) : null}
    </div>
  );
}
