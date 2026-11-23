# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current status

Pre-alpha. The design reviews R1-R6 are approved and the Phase 0 Rust + Tauri spike is in progress. This repository contains workspace scaffolding only: the package layout, toolchain pinning, shared Rust crate placeholders, and governance files. The desktop and Android applications are not implemented.

## Purpose and release boundary

`bluewhale_clients` contains the Windows and Android applications for the Bluewhale product line and is intended to be open source. The shared core is in the sibling `bluewhale_core` repository. `bluewhale_server` is proprietary and closed source, and `bluewhale-ledger` is a proprietary Apple application used only as a behavioral reference.

Rules:

- Do not copy code, assets, fixtures, or documents from `bluewhale-ledger` into this repository.
- The Apache License, Version 2.0 applies (`LICENSE`); keep `NOTICE` (Copyright 2026 BerryUIKI) intact.
- Do not add a dependency on a specific closed-source server or on private Apple code.

## Workspace layout

| Path | Responsibility |
| --- | --- |
| `desktop/` | Tauri 2 Windows application and its thin Rust command layer |
| `android/` | Tauri 2 Android application, Kotlin plugins, and the committed Gradle project |
| `ui/` | Shared React interface, features, localization, and styles |
| `packages/ipc` | Generated TypeScript bindings and the typed command client |
| `packages/config` | Shared TypeScript, ESLint, Prettier, Vite, and Vitest configuration |
| `packages/testkit` | Test doubles, fixtures, and accessibility helpers |
| `crates/clients-runtime` | Application services composing core use cases |
| `crates/clients-ipc` | Tauri commands, DTOs, and bindings generation |
| `crates/clients-testkit` | Fake platform services and IPC harnesses |
| `e2e/` | Browser, Windows, and Android end-to-end tests |

Architectural rules:

- Financial logic lives in `bluewhale_core`. The UI, Tauri command handlers, Kotlin plugins, and test fixtures must not implement money rules, rounding, or balance calculations.
- Money crosses the IPC boundary as exact strings and integers; never as a JavaScript `number` for arithmetic.
- Tauri commands are thin adapters: validate transport input, call a runtime operation, map errors to stable codes.
- The shared UI never imports platform-specific code directly; platform services are injected.
- Generated files (`packages/ipc/src/bindings.ts`, the Android Gradle project) are committed and must be regenerated rather than hand-edited.
- Never commit keystores, signing certificates, passwords, or real financial data. Use synthetic fixtures.

## Commands

```text
pnpm install
pnpm format
pnpm lint
pnpm typecheck
pnpm test
cargo fmt --all --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

The application packages are added in Phase 1; the pnpm commands become meaningful when those packages exist. Android builds additionally need JDK 21, the Android SDK/NDK, and the Rust Android targets.

## Core dependency

The client Rust crates will depend on the core crates through a pinned git release tag (`core-vX.Y.Z`). Until the first core tag is pushed, this repository does not depend on the core, so every commit stays buildable. Local side-by-side development uses an untracked `.cargo/config.toml` `[patch]` override; CI never uses it. See `docs/architecture/REPOSITORY_LAYOUT.md` in `bluewhale_core`.

## Development workflow

- Trunk-based development on `main`; small focused commits.
- Conventional Commits and Developer Certificate of Origin sign-off (`git commit -s`).
- A behavior, schema, or protocol change updates the design document and `CHANGELOG.md` in the same change.
- User-facing changes must remain keyboard operable, correctly announced by screen readers, and fully localized in English and Simplified Chinese (`en`, `zh-Hans`).
- Accessibility and localization checks are required for UI changes; record what was tested.

## Documentation

The approved design is in the core repository: `docs/clients/CLIENT_DESIGN.md` and `docs/clients/SPIKE_RESULTS.md`. Start at `docs/README.md` in `bluewhale_core`.

Do not present planned or unverified behavior as implemented. Record observed results with the exact command, environment, and date.
