import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "../../lib/errors";
import { useIpc } from "../../lib/ipc-context";
import { usePreferences } from "../../lib/preferences-context";
import type { Language, Theme } from "../../lib/preferences";

export function SettingsPage() {
  const { t } = useTranslation();
  const ipc = useIpc();
  const { preferences, setPreferences } = usePreferences();
  const about = useQuery({ queryKey: ["app", "info"], queryFn: () => ipc.appInfo() });

  return (
    <section className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-1 text-base font-semibold">{t("settings.language")}</legend>
        <p className="mt-1 text-sm text-muted">{t("settings.languageDescription")}</p>
        <div className="mt-4 flex flex-col gap-3">
          <Choice
            name="language"
            value="en"
            checked={preferences.language === "en"}
            label="English"
            onSelect={() => setPreferences({ ...preferences, language: "en" })}
          />
          <Choice
            name="language"
            value="zh-Hans"
            checked={preferences.language === "zh-Hans"}
            label="简体中文"
            onSelect={() => setPreferences({ ...preferences, language: "zh-Hans" })}
          />
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="px-1 text-base font-semibold">{t("settings.appearance")}</legend>
        <p className="mt-1 text-sm text-muted">{t("settings.appearanceDescription")}</p>
        <div className="mt-4 flex flex-col gap-3">
          <Choice
            name="theme"
            value="system"
            checked={preferences.theme === "system"}
            label={t("settings.appearanceSystem")}
            onSelect={() => setPreferences({ ...preferences, theme: "system" })}
          />
          <Choice
            name="theme"
            value="light"
            checked={preferences.theme === "light"}
            label={t("settings.appearanceLight")}
            onSelect={() => setPreferences({ ...preferences, theme: "light" })}
          />
          <Choice
            name="theme"
            value="dark"
            checked={preferences.theme === "dark"}
            label={t("settings.appearanceDark")}
            onSelect={() => setPreferences({ ...preferences, theme: "dark" })}
          />
        </div>
      </fieldset>

      <section
        aria-labelledby="about-heading"
        className="rounded-lg border border-line bg-surface p-6"
      >
        <h2 id="about-heading" className="text-base font-semibold">
          {t("settings.about")}
        </h2>
        <div className="mt-4 text-sm" aria-live="polite">
          {about.isPending ? <p className="text-muted">{t("settings.aboutLoading")}</p> : null}
          {about.isError ? (
            <p role="alert" className="font-medium text-danger">
              {t(errorMessageKey(about.error))}
            </p>
          ) : null}
          {about.data ? (
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
              <dt className="text-muted">{t("settings.aboutName")}</dt>
              <dd>{about.data.name}</dd>
              <dt className="text-muted">{t("settings.aboutVersion")}</dt>
              <dd className="font-mono">{about.data.version}</dd>
            </dl>
          ) : null}
        </div>
      </section>
    </section>
  );
}

function Choice({
  name,
  value,
  checked,
  label,
  onSelect,
}: {
  name: "language" | "theme";
  value: Language | Theme;
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  const id = `${name}-${value}`;
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="size-4 accent-accent"
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}
