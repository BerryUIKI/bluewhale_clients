# Shared UI

The React + TypeScript interface shared by the desktop and Android
applications.

- `src/app`: providers, hash routing, the application shell, the error boundary,
  and the not-found page.
- `src/features`: feature screens. The Phase 3.1 shell provides the overview and
  settings screens.
- `src/lib`: the IPC client and context, preferences, localization, and command
  error mapping.
- `src/locales`: English and Simplified Chinese resources; a test enforces
  identical, non-empty message keys.
- `src/styles`: the Tailwind entry point and the design tokens for light and
  dark appearance.
- `src/test`: the Vitest setup.

Run the checks from the repository root:

```text
pnpm --filter @bluewhale/ui dev
pnpm --filter @bluewhale/ui build
pnpm --filter @bluewhale/ui typecheck
pnpm --filter @bluewhale/ui test
```

The interface never performs money arithmetic and never imports
platform-specific code; platform services arrive through the IPC context.
Radix UI primitives are added with the feature screens that need dialogs,
menus, and popovers; the Phase 3.1 shell uses native, accessible form controls.
