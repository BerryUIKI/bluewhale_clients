import { createContext, useContext } from "react";
import type { Preferences } from "./preferences";

/** The preferences value and its setter. */
export interface PreferencesContextValue {
  preferences: Preferences;
  setPreferences: (next: Preferences) => void;
}

/** The injection point for preferences. */
export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/** Returns the preferences context. */
export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (value === null) {
    throw new Error("PreferencesProvider is missing");
  }
  return value;
}
