# Desktop application

The Tauri 2 Windows application. `src-tauri` holds the thin Rust command
boundary; the shared interface lives in `../ui` and is embedded from `ui/dist`
at compile time.

- Commands are registered from `clients-ipc`; `app_info` supplies the build and
  platform metadata the shell displays.
- Security: a strict content security policy with a separate development policy
  for the Vite dev server, the `core:default` capability only, and no shell,
  process, file-system, or opener permissions. The Tauri `devtools` feature is
  not enabled.
- Icons are generated with
  `pnpm --filter @bluewhale/desktop exec tauri icon assets/app-icon.png` from
  `assets/app-icon.png`.

Build the interface first, then the application:

```text
pnpm --filter @bluewhale/ui build
pnpm --filter @bluewhale/desktop build:debug   # unbundled debug build
pnpm build                                     # release bundles
pnpm dev                                       # Vite plus the Tauri window
```
