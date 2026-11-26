import i18n from "i18next";
import type { i18n as I18nInstance } from "i18next";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { en } from "../locales/en";
import { zhHans } from "../locales/zh-Hans";
import type { Language } from "./preferences";

const resources = {
  en: { translation: en },
  "zh-Hans": { translation: zhHans },
};

function createI18n(language: Language): I18nInstance {
  const instance = i18n.createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

/** Provides translations and keeps the document language in sync. */
export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const [instance] = useState(() => createI18n(language));

  useEffect(() => {
    void instance.changeLanguage(language);
    document.documentElement.lang = language;
  }, [instance, language]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
