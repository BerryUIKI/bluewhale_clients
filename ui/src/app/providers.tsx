import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { I18nProvider } from "../lib/i18n";
import { IpcProvider } from "../lib/ipc-provider";
import type { IpcClient } from "../lib/ipc-context";
import { PreferencesProvider } from "../lib/preferences-provider";
import { applyTheme, loadPreferences, savePreferences } from "../lib/preferences";
import type { Preferences } from "../lib/preferences";

/** Wires preferences, localization, IPC, and server-state providers. */
export function AppProviders({
  ipc,
  children,
  initialPreferences,
}: {
  ipc: IpcClient;
  children: ReactNode;
  initialPreferences?: Preferences;
}) {
  const [preferences, setPreferences] = useState<Preferences>(
    () => initialPreferences ?? loadPreferences(window.localStorage),
  );

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
    [],
  );

  useEffect(() => {
    savePreferences(window.localStorage, preferences);
    applyTheme(preferences.theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      if (preferences.theme === "system") {
        applyTheme(preferences.theme, media);
      }
    };
    media.addEventListener("change", onSystemThemeChange);
    return () => media.removeEventListener("change", onSystemThemeChange);
  }, [preferences]);

  return (
    <PreferencesProvider preferences={preferences} onChange={setPreferences}>
      <I18nProvider language={preferences.language}>
        <IpcProvider client={ipc}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </IpcProvider>
      </I18nProvider>
    </PreferencesProvider>
  );
}
