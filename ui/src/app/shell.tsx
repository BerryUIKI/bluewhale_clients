import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "../components/brand-mark";
import { LedgerSwitcher } from "../features/ledgers/ledger-switcher";

/** The application frame: navigation, ledger switcher, and the routed page. */
export function AppShell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <a className="skip-link" href="#main">
        {t("shell.skipToContent")}
      </a>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="shrink-0 border-b border-line bg-surface md:flex md:w-60 md:flex-col md:border-b-0 md:border-r">
          <div className="flex items-center gap-3 px-5 py-4 md:py-6">
            <BrandMark className="size-8 text-accent" />
            <span className="text-lg font-semibold tracking-tight">Bluewhale</span>
          </div>
          <LedgerSwitcher />
          <nav
            aria-label={t("shell.navigation")}
            className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0"
          >
            <NavItem to="/" end label={t("shell.home")} />
            <NavItem to="/ledgers" label={t("shell.ledgers")} />
            <NavItem to="/settings" label={t("shell.settings")} />
          </nav>
          <p className="mt-auto hidden px-5 py-6 text-xs text-muted md:block">
            {t("shell.localFirst")}
          </p>
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-6 py-8 md:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, end = false, label }: { to: string; end?: boolean; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-accent-soft text-accent"
            : "text-muted hover:bg-surface-raised hover:text-ink",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
