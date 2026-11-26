/** Languages shipped in the interface. */
export type Language = "en" | "zh-Hans";

/** Appearance preference. `system` follows the operating system. */
export type Theme = "system" | "light" | "dark";

/** Preferences persisted in local storage. */
export interface Preferences {
  language: Language;
  theme: Theme;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: "en",
  theme: "system",
};

const STORAGE_KEY = "bluewhale.preferences.v1";

/** Reads preferences, falling back to defaults for missing or invalid data. */
export function loadPreferences(storage: Storage): Preferences {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
      return DEFAULT_PREFERENCES;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_PREFERENCES;
    }
    const candidate = parsed as Partial<Preferences>;
    return {
      language: candidate.language === "zh-Hans" ? "zh-Hans" : "en",
      theme: candidate.theme === "light" || candidate.theme === "dark" ? candidate.theme : "system",
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** Persists preferences. */
export function savePreferences(storage: Storage, preferences: Preferences): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

/** Resolves the theme applied to the document. */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): "light" | "dark" {
  if (theme === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return theme;
}

/** Applies the resolved theme to the document root. */
export function applyTheme(
  theme: Theme,
  media: Pick<MediaQueryList, "matches"> = window.matchMedia("(prefers-color-scheme: dark)"),
): void {
  document.documentElement.dataset.theme = resolveTheme(theme, media.matches);
}
