# bluewhale_clients

Windows and Android applications for the Bluewhale product line.

## Status

Pre-alpha. The product, architecture, domain, sync, client, and quality reviews (R1-R6) are approved, and the Phase 0 Rust + Tauri spike is complete. The Phase 3.1 shell is implemented: a Tauri 2 Windows application, the shared React + TypeScript interface with routing, design tokens, English and Simplified Chinese resources, typed IPC bindings generated from the Rust command boundary, and localized error handling. Phase 3.2 adds ledger management: first-run setup, multiple ledgers with separate SQLCipher databases, switching, and non-destructive recovery when a store cannot be opened. Phase 3.3 adds master data: accounts with opening balances, tags, owners, and custom groups; two-level categories; tags; counterparties; and archive behavior on every list. The Android application and the transaction, report, and sync features are not implemented yet, and no client is installable.

The shared core lives in [bluewhale_core](https://github.com/BerryUIKI/bluewhale_core). The sync server is a separate private repository.

## Layout

| Path                | Responsibility                                                                |
| ------------------- | ----------------------------------------------------------------------------- |
| `desktop/`          | Tauri 2 Windows application and its thin Rust command layer                   |
| `android/`          | Tauri 2 Android application, Kotlin plugins, and the generated Gradle project |
| `ui/`               | Shared React user interface, features, localization, and styles               |
| `packages/ipc/`     | Generated TypeScript bindings and the typed client for Tauri commands         |
| `packages/config/`  | Shared TypeScript, ESLint, Prettier, Vite, and Vitest configuration           |
| `packages/testkit/` | Test doubles, fixtures, and accessibility helpers                             |
| `crates/`           | Rust runtime, Tauri command boundary, platform services, and test support     |
| `e2e/`              | Browser, Windows, and Android end-to-end tests                                |

The shared UI never contains financial logic. Tauri commands are thin adapters over the core use cases, and the Android fallback (a Compose application) can replace `android/` without touching `desktop/` or `ui/`.

## Documentation

The approved design and Phase 0 evidence live in the core repository: `docs/clients/CLIENT_DESIGN.md` and `docs/clients/SPIKE_RESULTS.md`. Start at its `docs/README.md`. Observed implementation results are recorded in [docs/verification.md](docs/verification.md).

## Build and test

The workspace is managed with pnpm 11 and Node 24 (see `.node-version`); Rust code is pinned to 1.97.1 by `rust-toolchain.toml`.

```text
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @bluewhale/ui build
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo deny check
```

Build the interface before the Rust commands: the desktop crate embeds `ui/dist` when it is compiled. Run the application with `pnpm dev`, which starts Vite and the Tauri window; `pnpm build` produces the release bundles. The TypeScript bindings in `packages/ipc/src/bindings.ts` are generated from the Rust command signatures with `cargo run -p clients-ipc --bin export_bindings`, and a Rust test fails when the committed file drifts.

The Rust workspace builds `core-persistence` with vendored SQLCipher and OpenSSL, so the native Windows Perl and `nmake` requirement from the core applies here too. Run cargo from an environment that has `vcvars64.bat` applied and Strawberry Perl first on `PATH`; a small `target/build-env.bat` wrapper works. The core crates are pinned in [docs/development/core-pin.md](docs/development/core-pin.md).

For development against a separate data directory, set `BLUEWHALE_DATA_DIR` before starting the application.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the remaining prerequisites.

## Licensing

Copyright 2026 BerryUIKI.

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues are reported privately according to [SECURITY.md](SECURITY.md). Sign off every commit with `git commit -s`.
