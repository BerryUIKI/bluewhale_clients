import type { ReactNode } from "react";
import { PreferencesContext } from "./preferences-context";
import type { Preferences } from "./preferences";

/** Provides the current preferences and a setter. */
export function PreferencesProvider({
  preferences,
  onChange,
  children,
}: {
  preferences: Preferences;
  onChange: (next: Preferences) => void;
  children: ReactNode;
}) {
  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences: onChange }}>
      {children}
    </PreferencesContext.Provider>
  );
}
