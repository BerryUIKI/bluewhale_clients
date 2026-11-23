# bluewhale_clients

Windows and Android applications for the Bluewhale product line.

## Status

Pre-alpha. The product, architecture, domain, sync, client, and quality reviews (R1-R6) are approved, and the Phase 0 Rust + Tauri spike is in progress. This repository contains the workspace scaffolding only: the package layout, toolchain pinning, and governance files are in place, but the desktop and Android applications are not implemented and cannot be installed.

The shared core lives in [bluewhale_core](https://github.com/BerryUIKI/bluewhale_core). The sync server is a separate private repository.

## Layout

| Path | Responsibility |
| --- | --- |
| `desktop/` | Tauri 2 Windows application and its thin Rust command layer |
| `android/` | Tauri 2 Android application, Kotlin plugins, and the generated Gradle project |
| `ui/` | Shared React user interface, features, localization, and styles |
| `packages/ipc/` | Generated TypeScript bindings and the typed client for Tauri commands |
| `packages/config/` | Shared TypeScript, ESLint, Prettier, Vite, and Vitest configuration |
| `packages/testkit/` | Test doubles, fixtures, and accessibility helpers |
| `e2e/` | Browser, Windows, and Android end-to-end tests |

The shared UI never contains financial logic. Tauri commands are thin adapters over the core use cases, and the Android fallback (a Compose application) can replace `android/` without touching `desktop/` or `ui/`.

## Documentation

The approved design and Phase 0 evidence live in the core repository: `docs/clients/CLIENT_DESIGN.md` and `docs/clients/SPIKE_RESULTS.md`. Start at its `docs/README.md`.

## Build and test

The application packages are added in Phase 1. The workspace is managed with pnpm 11 and Node 24 (see `.node-version`); Rust code is pinned to 1.97.1 by `rust-toolchain.toml`.

```text
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for prerequisites, including the native Perl and `nmake` requirement for the vendored SQLCipher/OpenSSL build on Windows.

## Licensing

Copyright 2026 BerryUIKI.

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues are reported privately according to [SECURITY.md](SECURITY.md). Sign off every commit with `git commit -s`.
