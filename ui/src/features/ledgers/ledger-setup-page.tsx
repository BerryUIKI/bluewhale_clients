import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import type { CreateLedgerRequestDto } from "@bluewhale/ipc";
import { BrandMark } from "../../components/brand-mark";
import { errorMessageKey, errorPath } from "../../lib/errors";
import { useCreateLedger } from "../../lib/ledger-queries";
import { CURRENCIES, TIME_ZONES, preferredTimeZone } from "./options";

const setupSchema = z.object({
  name: z.string().trim().min(1, "setup.nameRequired").max(60, "setup.nameTooLong"),
  emoji: z.string().trim().min(1, "setup.emojiRequired"),
  currencyCode: z.enum(CURRENCIES),
  timeZoneIdentifier: z.enum(TIME_ZONES),
});

type SetupValues = z.infer<typeof setupSchema>;

/**
 * The first-run setup and the add-ledger form.
 *
 * The interface supplies the localized default account and category names; the
 * core creates and validates them with the rest of the ledger.
 */
export function LedgerSetupPage({ variant }: { variant: "first-run" | "add" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateLedger();
  const resolver = useMemo(() => zodResolver(setupSchema), []);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupValues>({
    resolver,
    defaultValues: {
      name: "",
      emoji: "🐳",
      currencyCode: "USD",
      timeZoneIdentifier: preferredTimeZone(),
    },
  });

  const submit = (values: SetupValues) => {
    const request: CreateLedgerRequestDto = {
      ...values,
      defaultContent: {
        cashAccountName: t("setup.defaults.cash"),
        expenseCategoryNames: [
          t("setup.defaults.expenseFood"),
          t("setup.defaults.expenseTransport"),
          t("setup.defaults.expenseHousing"),
        ],
        incomeCategoryNames: [t("setup.defaults.incomeSalary"), t("setup.defaults.incomeOther")],
      },
    };
    create.mutate(request, {
      onSuccess: () => {
        navigate("/", { replace: true });
      },
    });
  };

  const path = errorPath(create.error);

  return (
    <div
      className={
        variant === "first-run"
          ? "flex min-h-screen items-center justify-center px-6 py-10"
          : "mx-auto max-w-2xl"
      }
    >
      <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-8">
        {variant === "first-run" ? (
          <div className="mb-6 flex items-center gap-3">
            <BrandMark className="size-8 text-accent" />
            <span className="text-lg font-semibold tracking-tight">Bluewhale</span>
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{t("setup.title")}</h1>
        <p className="mt-1 text-muted">{t("setup.subtitle")}</p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(submit)} noValidate>
          <div>
            <label htmlFor="ledger-name" className="block text-sm font-medium">
              {t("setup.name")}
            </label>
            <input
              id="ledger-name"
              type="text"
              autoComplete="off"
              className="input mt-1"
              placeholder={t("setup.namePlaceholder")}
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "ledger-name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="ledger-name-error" role="alert" className="mt-1 text-sm text-danger">
                {t(errors.name.message ?? "errors.internal")}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="ledger-emoji" className="block text-sm font-medium">
              {t("setup.emoji")}
            </label>
            <input
              id="ledger-emoji"
              type="text"
              autoComplete="off"
              className="input mt-1 w-24 text-center text-lg"
              aria-invalid={errors.emoji ? true : undefined}
              aria-describedby={errors.emoji ? "ledger-emoji-error" : "ledger-emoji-hint"}
              {...register("emoji")}
            />
            {errors.emoji ? (
              <p id="ledger-emoji-error" role="alert" className="mt-1 text-sm text-danger">
                {t(errors.emoji.message ?? "errors.internal")}
              </p>
            ) : (
              <p id="ledger-emoji-hint" className="mt-1 text-xs text-muted">
                {t("setup.emojiHint")}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ledger-currency" className="block text-sm font-medium">
                {t("setup.currency")}
              </label>
              <select id="ledger-currency" className="input mt-1" {...register("currencyCode")}>
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ledger-time-zone" className="block text-sm font-medium">
                {t("setup.timeZone")}
              </label>
              <select
                id="ledger-time-zone"
                className="input mt-1"
                {...register("timeZoneIdentifier")}
              >
                {TIME_ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-xs text-muted">{t("setup.defaultsNote")}</p>

          {create.isError ? (
            <div
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm"
            >
              <p className="font-medium text-danger">{t(errorMessageKey(create.error))}</p>
              {path ? <p className="mt-1 font-mono text-xs break-all">{path}</p> : null}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            {variant === "add" ? (
              <Link to="/ledgers" className="button button-secondary">
                {t("setup.cancel")}
              </Link>
            ) : null}
            <button type="submit" className="button" disabled={create.isPending}>
              {create.isPending ? t("setup.submitting") : t("setup.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
