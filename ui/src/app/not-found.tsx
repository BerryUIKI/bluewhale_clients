import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("notFound.title")}</h1>
      <p className="text-muted">{t("notFound.body")}</p>
      <Link className="inline-block text-sm font-medium text-accent underline" to="/">
        {t("notFound.backHome")}
      </Link>
    </section>
  );
}
