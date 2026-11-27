# Verification record

Observed results for the client implementation. Planned or unverified behavior
is listed separately. The design lives in the core repository:
`docs/clients/CLIENT_DESIGN.md`, with the Phase 0 evidence in
`docs/clients/SPIKE_RESULTS.md`.

## Phase 3.1 shell (2026-11-26)

### Environment

| Item     | Value                                                                    |
| -------- | ------------------------------------------------------------------------ |
| Date     | 2026-11-26                                                               |
| Host     | Windows 10 Pro 10.0.19045, `x86_64-pc-windows-msvc`                      |
| Node     | 24.15.0                                                                  |
| pnpm     | 11.18.0                                                                  |
| Rust     | 1.97.1                                                                   |
| Tauri    | 2.12.7 (CLI 2.12.6)                                                      |
| WebView2 | Installed runtime, driven over the Chrome DevTools Protocol on port 9222 |

### Commands and results

| Command                                                 | Result                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pnpm install`                                          | Completed.                                                                              |
| `pnpm format`                                           | All files use Prettier style.                                                           |
| `pnpm lint`                                             | 0 problems.                                                                             |
| `pnpm typecheck`                                        | Clean for `@bluewhale/ipc` and `@bluewhale/ui`.                                         |
| `pnpm test`                                             | 6 files, 24 tests passed.                                                               |
| `pnpm --filter @bluewhale/ui build`                     | 115 modules; JS 414.46 kB (130.29 kB gzip), CSS 11.82 kB (3.40 kB gzip).                |
| `cargo fmt --all --check`                               | Clean.                                                                                  |
| `cargo clippy --workspace --all-targets -- -D warnings` | Clean.                                                                                  |
| `cargo test --workspace`                                | 5 tests passed, including the bindings drift test.                                      |
| `cargo deny check`                                      | advisories, bans, licenses, and sources ok, with the recorded Tauri license exceptions. |
| `pnpm --filter @bluewhale/desktop build:debug`          | Built `target/debug/bluewhale-desktop.exe`.                                             |
| GitHub Actions on `104b3db`                             | UI CI passed in 26 s; Windows desktop CI passed in 6 min 28 s.                          |

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

## Phase 3.2 ledger management (2026-11-26)

### Changes

- The six core crates are pinned from the public repository at
  `7e9cdefb1415f206c653ccc77b1241c9ea9bbce2`; `Cargo.lock` records the revision
  and [development/core-pin.md](development/core-pin.md) records the pin and the
  annotated `v0.1.0` tag.
- A device-local ledger catalog, per-ledger SQLCipher databases initialized
  through the core ledger use case, user-scoped DPAPI key protection, the ledger
  IPC commands, and the first-run setup, ledger manager, switcher, and overview
  screens.

### Commands and results

| Command                                                 | Result                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                          | Completed.                                                                                                                  |
| `pnpm format`, `pnpm lint`                              | Clean; 0 problems.                                                                                                          |
| `pnpm typecheck`                                        | Clean for `@bluewhale/ipc` and `@bluewhale/ui`.                                                                             |
| `pnpm test`                                             | 8 files, 36 tests passed.                                                                                                   |
| `pnpm --filter @bluewhale/ui build`                     | 275 modules; JS 594.36 kB (185.30 kB gzip), CSS 20.14 kB (4.42 kB gzip).                                                    |
| `cargo fmt --all --check`                               | Clean.                                                                                                                      |
| `cargo clippy --workspace --all-targets -- -D warnings` | Clean.                                                                                                                      |
| `cargo test --workspace`                                | 23 tests passed: 4 IPC, 3 platform, 16 runtime.                                                                             |
| `cargo deny check`                                      | advisories, bans, licenses, and sources ok, with the recorded Tauri and SQLCipher licenses and the allowed core git source. |
| `pnpm --filter @bluewhale/desktop build:debug`          | Built `target/debug/bluewhale-desktop.exe`.                                                                                 |
| Single-instance check                                   | A second launch exited with code 0 in 195 ms while the first instance stayed open.                                          |
| GitHub Actions on `9c1bebb`                             | UI CI passed in 29 s; Windows desktop CI passed in 13 min 31 s (cold build with SQLCipher and OpenSSL).                     |

### Live ledger check

The application was started with
`BLUEWHALE_DATA_DIR=D:\dev\scratch\bw-p32`, the WebView2 debug endpoint, and a
clean data directory. The DevTools Protocol drove the interface:

1. The first-run setup appears for an empty catalog.
2. Creating `Household` with CNY and `Asia/Shanghai` opens the overview with the
   name, currency, time zone, and creation date.
3. `catalog.json` has schema version 1, names the new ledger as active, and
   contains no key material. `ledgers/<id>/ledger.db` and `ledger.key` exist; the
   key file is a 262-byte DPAPI blob, not a raw 32-byte key.
4. A second ledger, `Business`, is created and the switcher lists both.
5. Switching back to Household shows its profile.
6. Switching to Business shows its profile.
7. The inactive Household database was deleted to simulate a lost store.
8. After reloading the window, the ledger manager shows Household as
   unavailable with "The database file is missing.", its data location, Retry,
   and Remove from this device. Business remains active.
9. Retry reports that the ledger could not be opened.
10. The removal dialog explains that the database and key files stay in the data
    location.
11. Removing Household updates the catalog; Business remains. The Household key
    file is still on disk, and the database had been deleted by the simulation.

### Not verified in this environment

- **Release bundles and installers:** only the debug build was produced; MSI and
  NSIS packaging belong to P3.8.
- **Cross-user key access:** DPAPI is user-scoped, so another Windows user should
  see the key-unreadable recovery state; this was not exercised.
- **Single-instance bypass:** the plugin prevents a second launch of the same
  executable; copying the executable under another name and running it against
  the same data directory was not tested.
- **Catalog repair:** a corrupt `catalog.json` surfaces the error with a retry
  and is never overwritten; automatic repair is not implemented.
- **Android and release packaging:** unchanged from Phase 3.1.

## Phase 3.3 master data (2026-11-27)

### Changes

- Accounts, custom account groups, two-level expense and income categories, tags,
  and counterparties. Every record supports create, edit, archive, and restore;
  archived records stay in the snapshot and the screens hide them behind a
  show-archived toggle.
- The master-data snapshot is one typed command (`master_data`); every mutation
  is one command mapped to an approved core use case. New records append to the
  manual order; the interface does not edit positions.
- The account form collects an optional opening balance at creation, tags, a
  household-member owner, a custom group, a note, and the hidden and net-worth
  flags. The currency defaults to the ledger reporting currency and cannot
  change after creation.
- The interface adds accessible modal forms (Radix Dialog, React Hook Form,
  Zod) and English and Simplified Chinese resources for every screen.

### Commands and results

| Command                                                 | Result                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                                          | Completed; added `@radix-ui/react-dialog` 1.3.1.                                                                            |
| `pnpm format`, `pnpm lint`                              | Clean; 0 problems.                                                                                                          |
| `pnpm typecheck`                                        | Clean for `@bluewhale/ipc` and `@bluewhale/ui`.                                                                             |
| `pnpm test`                                             | 12 files, 53 tests passed.                                                                                                  |
| `pnpm --filter @bluewhale/ui build`                     | 288 modules; JS 638.08 kB (193.74 kB gzip), CSS 21.55 kB (4.71 kB gzip). Vite reports one chunk above 500 kB.               |
| `cargo fmt --all --check`                               | Clean.                                                                                                                      |
| `cargo clippy --workspace --all-targets -- -D warnings` | Clean.                                                                                                                      |
| `cargo test --workspace`                                | 38 tests passed: 7 IPC, 3 platform, and 28 runtime, including 11 master-data tests and 1 database-access test.              |
| `cargo deny check`                                      | advisories, bans, licenses, and sources ok, with the recorded Tauri and SQLCipher licenses and the allowed core git source. |
| `pnpm --filter @bluewhale/desktop build:debug`          | Built `target/debug/bluewhale-desktop.exe`.                                                                                 |

### Live master-data check

The final debug build was started with
`BLUEWHALE_DATA_DIR=D:\dev\scratch\bw-p33c-20261127\data`,
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9417`, and a
clean data directory. The DevTools Protocol drove the interface:

1. First-run setup creates `Household` with CNY and `Asia/Shanghai`.
2. The Tags screen creates `Travel`; the Counterparties screen creates `Alex`
   with the household-member kind.
3. The Accounts screen creates `Main checking` with the checking type, an
   opening balance of `1250.50`, the `Travel` tag, and `Alex` as owner. The
   account row shows Checking, CNY, Travel, and Owner: Alex; the currency
   defaulted to the ledger reporting currency.
4. Archiving hides the account; Show archived reveals it with the Archived
   badge; Restore returns it.
5. The Categories screen creates the `Essentials` expense group and the
   `Groceries` category inside it; archiving and restoring the category works.
6. Reloading the window keeps the ledger active and the account, tag,
   counterparty, group, and category present.
7. `catalog.json` holds schema version 1, the ledger descriptor, and the active
   id, with no key material. `ledger.key` is a 262-byte DPAPI blob starting
   `01 00 00 00`; `ledger.db` does not start with the SQLite header.

### Observations

- The Tauri CLI build is required for the live check: a plain `cargo build`
  debug binary loaded the Vite development URL because Tauri treats a debug
  build as development, while `pnpm --filter @bluewhale/desktop build:debug`
  embeds `ui/dist`. CI uses the CLI build.
- The account form originally defaulted to USD; the live check showed a CNY
  ledger creating a USD account. The form now defaults to the active ledger's
  reporting currency.
- The owner list offers household members only, matching the account owner rule
  in the data model.
- An archived group cannot accept members in the core. Editing a category or
  account whose group is archived shows a hint, defaults to no group, and lets
  the save move the record out of the archived group.

### Not verified in this environment

- **Release bundles and installers:** only the debug build was produced; MSI and
  NSIS packaging belong to P3.8.
- **Master data in transactions and reports:** assigning categories, tags, and
  counterparties to entries belongs to P3.4 and P3.5.
- **Manual reordering:** new records append to the manual order; drag or move
  controls are not implemented.
- **Accessibility automation and Chinese screens:** dialog focus management and
  native controls are in place, but no axe or NVDA pass was run, and the Chinese
  screens were not reviewed manually; locale key parity and non-empty messages
  are tested.
- **Android and release packaging:** unchanged from Phase 3.1.
