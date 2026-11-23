# Contributing to Bluewhale Clients

Thank you for your interest in Bluewhale. This repository is in a pre-alpha state: the design review is complete, the Phase 0 spike is running, and the client applications are not implemented yet.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- Read the client design in the core repository: `docs/clients/CLIENT_DESIGN.md` (R5). Product, architecture, domain, sync, and quality decisions are in the same `docs/` tree.
- Behavior, schema, protocol, and user-visible changes need an approved design before code.
- Keep changes small and focused. Trunk-based development: `main` must stay releasable.

## Licensing and sign-off

- The project is licensed under the Apache License, Version 2.0. By contributing you agree that your contribution is licensed under the same terms.
- Sign off every commit with `git commit -s` (Developer Certificate of Origin).
- Do not copy code, assets, fixtures, or documents from the private Apple application or from any other project without a recorded licensing decision.

## Development setup

Prerequisites:

- Node 24.15 and pnpm 11.18 (see `.node-version` and `package.json`).
- Rust 1.97.1 through rustup; `rust-toolchain.toml` selects it.
- Windows: Visual Studio 2022 with the C++ workload, plus a native Windows Perl (for example Strawberry Perl) and `nmake` on `PATH` for the vendored SQLCipher/OpenSSL build.
- Android builds additionally need JDK 21, the Android SDK with the pinned platform/build-tools/NDK, and the `x86_64-linux-android`, `aarch64-linux-android`, and `armv7-linux-androideabi` Rust targets.

Commands are added as each application lands. The expected entry points are:

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

## Accessibility and localization

The client must stay keyboard operable, announced correctly by screen readers, and fully localized in English and Simplified Chinese. A user-facing change states what was checked with a keyboard and a screen reader, and includes both `en` and `zh-Hans` resources.

## Commit and pull-request conventions

- Conventional Commits: `type(scope): summary`, with `type` in `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`.
- Open a pull request against `main` and describe the scope, design reference, tests run, and platform impact.
- Never include real financial data, credentials, encryption keys, recovery keys, ciphertext, or signing material in commits, issues, screenshots, or logs.

## Security

Do not report vulnerabilities as public issues. Follow [SECURITY.md](SECURITY.md).
