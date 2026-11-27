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
| GitHub Actions on `dad5ddb`                             | UI CI passed in 42 s; Windows desktop CI passed in 3 min 8 s; Core CI on `dc5012e` passed in 1 min 29 s.                    |

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

## Phase 3.4 transactions (2026-11-27)

### Changes

- The transactions screen lists expenses, incomes, transfers, and opening
  balances by ledger-local day, with search and filters for kind, account,
  category, tag, counterparty, and an inclusive ledger-local date range.
- The editor creates and edits expenses, incomes, and transfers. It defaults the
  occurrence time to the ledger time zone, reveals the received-amount field only
  for cross-currency transfers, and requires active accounts, categories, tags,
  and counterparties. Opening balances are listed and recoverable but cannot be
  edited.
- Soft deletion moves an entry to the recovery view, where it can be restored.
  The history shows a deleted-status message with a link to recovery.
- Amounts cross the IPC boundary as exact decimal strings with their currency
  scale; the runtime formats them, and the interface never parses or converts
  money. Occurrence times carry both the UTC instant and the ledger-local date
  and time.
- Ten interface tests cover the list, filters, creation, cross-currency
  transfers, editing, deletion and recovery, opening balances, and validation;
  the runtime and IPC layers add fourteen tests.

### Commands and results

| Command                                                 | Result                                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format`, `pnpm lint`                              | Clean; 0 problems.                                                                                                          |
| `pnpm typecheck`                                        | Clean for `@bluewhale/ipc` and `@bluewhale/ui`.                                                                             |
| `pnpm test`                                             | 13 files, 63 tests passed.                                                                                                  |
| `pnpm --filter @bluewhale/ui build`                     | 298 modules; JS 674.13 kB (201.40 kB gzip), CSS 23.54 kB (5.04 kB gzip). Vite reports one chunk above 500 kB.               |
| `cargo fmt --all --check`                               | Clean.                                                                                                                      |
| `cargo clippy --workspace --all-targets -- -D warnings` | Clean.                                                                                                                      |
| `cargo test --workspace`                                | 52 tests passed: 10 IPC, 3 platform, and 39 runtime, including 11 transaction tests.                                        |
| `cargo deny check`                                      | advisories, bans, licenses, and sources ok, with the recorded Tauri and SQLCipher licenses and the allowed core git source. |
| `pnpm --filter @bluewhale/desktop build:debug`          | Built `target/debug/bluewhale-desktop.exe`.                                                                                 |
| GitHub Actions on `e1e85fa`                             | UI CI passed in 33 s; Windows desktop CI passed in 3 min 26 s; Core CI on `e4df9b7` passed in 1 min 47 s.                   |

### Live transactions check

The final debug build was started with
`BLUEWHALE_DATA_DIR=D:\dev\scratch\bw-p34d-20261127\data`,
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9417`, and a
clean data directory. The DevTools Protocol drove the interface:

1. Setup creates `Household` (CNY, `Asia/Shanghai`). A USD account,
   `Dollar savings`, is created with a `25.00` opening balance.
2. The `Travel` tag and the `Alex` counterparty are created.
3. An expense of `88.50` CNY is recorded in Cash/Food with the Travel tag,
   Alex, and the note Groceries. The row shows `−88.50 CNY` and the
   ledger-local time `12:10` (Asia/Shanghai).
4. An income of `5000.00` CNY in Cash/Salary is recorded with the note Salary.
5. A transfer of `100.00` CNY to Dollar savings with a received amount of
   `14.20` USD is recorded; the row shows `100.00 CNY → 14.20 USD` and
   `Cash → Dollar savings`.
6. The history shows four rows including the `25.00 USD` opening balance, which
   has no Edit action.
7. Search `groceries` returns one row, the Income kind filter returns one row,
   and the Dollar savings account filter returns two rows (the transfer and the
   opening balance); clearing restores all four.
8. Editing the income to `5200.00` updates the row and keeps its identity.
9. Deleting the expense moves it to Recovery; restoring it returns it to the
   history.
10. Reloading the window keeps all four rows and their values.
11. The data directory holds an encrypted ledger database and a 262-byte DPAPI
    key blob; `catalog.json` has no key material.

### Observations

- The occurrence default is computed in the ledger time zone with
  `Intl.DateTimeFormat`, sent as a local date-time, and interpreted by the
  runtime in the same zone. The device time zone never changes the ledger day.
- Opening balances are rejected by `UpdateTransactionUseCase`; the history hides
  Edit for that kind and offers delete and restore only.
- The editor clears kind-specific fields when the kind changes and warns when a
  current reference is archived, because archived accounts, categories, tags,
  and counterparties cannot receive new assignments.
- The transaction list keeps the previous rows visible while a debounced filter
  query runs, so typing in the search field does not blank the screen.
- A soft-deleted transaction cannot be edited; opening it shows a recovery
  notice with a link to the recovery view.

### Not verified in this environment

- **Balances, totals, and reports:** Phase 3.5; the transaction screen shows
  entries, not aggregates.
- **Reconciliation flags and note presets:** deferred to v1.1 by the product
  spec.
- **Release bundles and installers:** only the debug build was produced; MSI and
  NSIS packaging belong to P3.8.
- **Accessibility automation and Chinese screens:** no axe or NVDA pass was run,
  and the live check used English; locale key parity and non-empty messages are
  tested.
- **10,000-transaction performance and virtualization:** P3.8.
- **Android:** unchanged from Phase 3.1.

## Phase 3.5 dashboard and reports (2026-11-27)

### Changes

- The overview becomes the ledger dashboard: native-currency balances for every
  active account, the converted net balance, monthly income, expense, and
  savings, and a daily cash-flow list with each day's entries. A month selector
  moves between ledger months.
- A new Reports screen shows the month's cash-flow summary and a ranked list of
  expense or income categories with transaction counts and converted totals; the
  kind switches without leaving the page.
- Missing exchange rates produce an explicit incomplete state: the missing
  currency pair is named, native balances stay visible, and every converted total
  or ranking is hidden rather than shown as a partial sum.
- The core gained `LoadCategoryRankingUseCase`: a ledger-month ranking of
  expense or income categories in the reporting currency, with category and group
  names, transaction counts, deterministic ordering, and missing-rate errors.
  `LedgerReadSnapshot` now carries categories and category groups. The client pin
  advances from `7e9cdef` to `184f288`; no new tag was created.
- Five interface tests cover balances and day detail, month navigation, the
  missing-rate dashboard, the report ranking and kind switch, and the incomplete
  ranking; the runtime adds five dashboard tests and the IPC layer two.

### Commands and results

| Command                                                 | Result                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format`, `pnpm lint`                              | Clean; 0 problems.                                                                                                                                            |
| `pnpm typecheck`                                        | Clean for `@bluewhale/ipc` and `@bluewhale/ui`.                                                                                                               |
| `pnpm test`                                             | 14 files, 68 tests passed.                                                                                                                                    |
| `pnpm --filter @bluewhale/ui build`                     | 305 modules; JS 688.69 kB (204.37 kB gzip), CSS 24.38 kB (5.23 kB gzip). Vite reports one chunk above 500 kB.                                                 |
| `cargo fmt --all --check`                               | Clean.                                                                                                                                                        |
| `cargo clippy --workspace --all-targets -- -D warnings` | Clean.                                                                                                                                                        |
| `cargo test --workspace`                                | 59 tests passed: 12 IPC, 3 platform, and 44 runtime, including 5 dashboard tests.                                                                             |
| `cargo deny check`                                      | advisories, bans, licenses, and sources ok, with the recorded Tauri and SQLCipher licenses and the allowed core git source.                                   |
| Core `cargo test --workspace` on `184f288`              | Passed, including four new category-ranking tests.                                                                                                            |
| Core `cargo clippy`, `cargo deny`, `cargo doc`          | Clean.                                                                                                                                                        |
| `pnpm --filter @bluewhale/desktop build:debug`          | Built `target/debug/bluewhale-desktop.exe`.                                                                                                                   |
| GitHub Actions on `d3fc247`                             | UI CI passed in 41 s; Windows desktop CI passed in 3 min 24 s; Core CI on `9f5411a` passed in 1 min 39 s (the feature commit `184f288` passed in 1 min 27 s). |

### Live dashboard and report check

The final debug build was started with
`BLUEWHALE_DATA_DIR=D:\dev\scratch\bw-p35d-20261127\data`,
`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9417`, and a
clean data directory. The DevTools Protocol drove the interface:

1. Setup creates `Household` (CNY, `Asia/Shanghai`).
2. Four transactions are recorded: Lunch `88.50` (Food), Bus `20.00`
   (Transport), and Salary `5000.00` (Salary) in November, plus October lunch
   `50.00` (Food) on 2026-10-15.
3. The dashboard shows Cash at `4841.50` CNY (the October expense counts in the
   all-time balance), a net balance of `4841.50` CNY, November income `5000.00`,
   expense `108.50`, savings `4891.50`, and a Nov 27 day detail with the three
   entries and signed amounts.
4. Previous month shows October: expense `50.00` and the October lunch entry;
   This month returns to November.
5. Reports show the expense ranking Food `88.50`, Transport `20.00`, total
   `108.50`; switching Kind to Income shows Salary `5000.00`.
6. A USD account, Dollar wallet, with a `25.00` opening balance is added. The
   dashboard reports the missing USD to CNY rate, keeps Cash `4841.50` CNY and
   Dollar wallet `25.00` USD, hides the net balance, and shows placeholders for
   the converted monthly totals.
7. Reports keep the complete expense ranking while marking the cash-flow section
   incomplete.
8. Reloading the window keeps the missing-rate state and all data.
9. The data directory holds an encrypted ledger database and a 262-byte DPAPI
   key blob.

### Observations

- The core dashboard converts every active transaction for the net balance, so
  any foreign-currency event anywhere in the ledger makes the conversion
  incomplete. The client still shows all native balances and names the first
  missing pair; converted totals are never partially presented.
- The category ranking and the dashboard cash flow are independent: a foreign
  opening balance can make the dashboard incomplete while the month's expense
  ranking remains complete.
- Month navigation sends a `YYYY-MM` value; the runtime interprets it on the 15th
  at noon in the ledger time zone, so month boundaries follow the ledger calendar
  rather than the device clock.
- The Reports kind switch reuses the same month and refetches only the ranking;
  the cash-flow summary does not reload.
- The dashboard keeps the ledger profile card and the unavailable and empty
  states from Phase 3.2.

### Not verified in this environment

- **Rate entry:** manual exchange-rate management is Phase 3.6; the live check
  exercised the missing-rate state rather than a complete conversion. Conversion
  with stored rates is covered by core and runtime tests.
- **Release bundles and installers:** only the debug build was produced; MSI and
  NSIS packaging belong to P3.8.
- **Accessibility automation and Chinese screens:** no axe or NVDA pass was run,
  and the live check used English; locale key parity and non-empty messages are
  tested.
- **10,000-transaction performance:** the dashboard is not yet exercised at that
  scale; P3.8.
- **Android:** unchanged from Phase 3.1.
