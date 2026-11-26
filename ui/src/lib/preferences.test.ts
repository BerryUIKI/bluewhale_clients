import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  applyTheme,
  loadPreferences,
  resolveTheme,
  savePreferences,
} from "./preferences";

describe("preferences", () => {
  it("returns defaults when nothing is stored", () => {
    expect(loadPreferences(window.localStorage)).toEqual(DEFAULT_PREFERENCES);
  });

  it("round-trips a saved preference set", () => {
    savePreferences(window.localStorage, { language: "zh-Hans", theme: "dark" });
    expect(loadPreferences(window.localStorage)).toEqual({
      language: "zh-Hans",
      theme: "dark",
    });
  });

  it("falls back to defaults for invalid data", () => {
    window.localStorage.setItem("bluewhale.preferences.v1", "{not json");
    expect(loadPreferences(window.localStorage)).toEqual(DEFAULT_PREFERENCES);
    window.localStorage.setItem("bluewhale.preferences.v1", JSON.stringify({ language: "fr" }));
    expect(loadPreferences(window.localStorage)).toEqual(DEFAULT_PREFERENCES);
  });

  it("resolves the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("applies the resolved theme to the document", () => {
    applyTheme("system", { matches: true });
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("light", { matches: true });
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
