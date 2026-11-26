export const en = {
  shell: {
    navigation: "Main navigation",
    skipToContent: "Skip to content",
    home: "Overview",
    settings: "Settings",
    localFirst: "Local-first. Your ledger stays on this device.",
  },
  home: {
    title: "Overview",
    subtitle: "Your ledger at a glance.",
    runtimeTitle: "Desktop runtime",
    runtimeLoading: "Checking the desktop runtime…",
    runtimeUnavailableHint:
      "Open the application through pnpm dev or the installed app to connect the desktop runtime.",
    version: "Version",
    platform: "Platform",
    emptyTitle: "No ledger yet",
    emptyBody: "Your overview will appear here once a ledger is set up.",
  },
  settings: {
    title: "Settings",
    language: "Language",
    languageDescription: "Choose the language of the interface.",
    appearance: "Appearance",
    appearanceDescription: "Follow the system theme or choose one explicitly.",
    appearanceSystem: "System",
    appearanceLight: "Light",
    appearanceDark: "Dark",
    about: "About",
    aboutName: "Application",
    aboutVersion: "Version",
    aboutLoading: "Loading application information…",
  },
  errors: {
    conflict: "The change conflicts with the current state.",
    forbidden: "This action is not allowed.",
    internal: "Something went wrong. Try again.",
    invalid_request: "The request was not valid.",
    not_found: "The requested item does not exist.",
    unavailable: "The desktop runtime is not available.",
  },
  notFound: {
    title: "Page not found",
    body: "The page you asked for does not exist.",
    backHome: "Back to the overview",
  },
  errorBoundary: {
    title: "The interface stopped unexpectedly",
    body: "Reload the window to continue. Your data is not affected.",
    reload: "Reload",
  },
};

/** The message shape every locale must provide. */
export type Messages = typeof en;
