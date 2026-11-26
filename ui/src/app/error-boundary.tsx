import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches render failures and shows a localized recovery screen. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled interface error", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold">{t("errorBoundary.title")}</h1>
        <p className="text-muted">{t("errorBoundary.body")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          {t("errorBoundary.reload")}
        </button>
      </div>
    </div>
  );
}
