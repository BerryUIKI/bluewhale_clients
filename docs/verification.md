# Verification record

Observed results for the client implementation. Planned or unverified behavior
is listed separately. The design lives in the core repository:
`docs/clients/CLIENT_DESIGN.md`, with the Phase 0 evidence in
`docs/clients/SPIKE_RESULTS.md`.

## Phase 3.1 shell (2026-11-26)

### Environment

| Item | Value |
| --- | --- |
| Date | 2026-11-26 |
| Host | Windows 10 Pro 10.0.19045, `x86_64-pc-windows-msvc` |
| Node | 24.15.0 |
| pnpm | 11.18.0 |
| Rust | 1.97.1 |
| Tauri | 2.12.7 (CLI 2.12.6) |
| WebView2 | Installed runtime, driven over the Chrome DevTools Protocol on port 9222 |

### Commands and results

| Command | Result |
| --- | --- |
| `pnpm install` | Completed. |
| `pnpm format` | All files use Prettier style. |
| `pnpm lint` | 0 problems. |
| `pnpm typecheck` | Clean for `@bluewhale/ipc` and `@bluewhale/ui`. |
| `pnpm test` | 6 files, 24 tests passed. |
| `pnpm --filter @bluewhale/ui build` | 115 modules; JS 414.46 kB (130.29 kB gzip), CSS 11.82 kB (3.40 kB gzip). |
| `cargo fmt --all --check` | Clean. |
| `cargo clippy --workspace --all-targets -- -D warnings` | Clean. |
| `cargo test --workspace` | 5 tests passed, including the bindings drift test. |
| `cargo deny check` | advisories, bans, licenses, and sources ok, with the recorded Tauri license exceptions. |
| `pnpm --filter @bluewhale/desktop build:debug` | Built `target/debug/bluewhale-desktop.exe`. |

### Live shell check

The debug application was started with
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` and driven
over the DevTools Protocol:

```text
document.title                  -> "Bluewhale"
typeof window.__TAURI_INTERNALS__ -> "object"
overview                        -> version 0.1.0, platform "windows / x86_64"
Settings link                   -> heading "Settings"
简体中文                        -> document lang "zh-Hans", heading "设置"
Dark appearance                 -> data-theme="dark"
```

The version and platform values are returned by the `app_info` Tauri command
through the generated bindings, so the check exercises the full path from the
React interface over Tauri IPC to the Rust command and back under the
production content security policy.

### Observations

- The bindings exporter and the `clients-ipc` test harnesses link Tauri and
  failed at startup with `STATUS_ENTRYPOINT_NOT_FOUND` until the crate embedded
  a Windows application manifest requesting Common Controls version 6. The
  build script now uses `tauri-winres` with `compile_for_everything`, so the
  manifest is present in binaries, tests, and the unit-test harness.
- The desktop crate embeds `ui/dist` at compile time, so the interface must be
  built before any Rust command that compiles the workspace.
- The production content security policy allows only the application origin
  and the Tauri IPC endpoint. The development policy additionally allows Vite's
  inline styles, scripts, and HMR socket.

### Not verified in this environment

- **Release bundles and installers:** only the debug build was produced; MSI and
  NSIS packaging belong to P3.8.
- **Development server path:** `pnpm dev` with Vite HMR under the development
  content security policy was not exercised.
- **Android:** the Android application is not implemented yet.
- **Accessibility automation:** no axe run and no manual NVDA/Narrator pass yet;
  semantic landmarks, the skip link, and visible focus are implemented but not
  verified with a screen reader.
- **CI:** the interface workflow passed on the first push; the Windows desktop
  workflow runs on the same push.
