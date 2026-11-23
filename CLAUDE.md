# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current status

This repository was empty when this file was created on 2026-11-23: no source code, build system, tests, CI, or license. If code now exists, replace this section with the actual architecture and commands.

## Purpose and release boundary

`bluewhale_clients` holds the open-source Windows and Android client applications for the Bluewhale product line. The shared core is the sibling `bluewhale_core` repository. `bluewhale_server` is planned to remain closed source, and `bluewhale-ledger` is a proprietary, Apple-native application.

Rules:

- The technology stack, project layout, and shared-core integration are not chosen yet. Do not infer them from `bluewhale-ledger`, which is Swift/SwiftUI/SwiftData and Apple-only, or from any private design document.
- Do not copy source code, assets, design documents, or test fixtures from `bluewhale-ledger` without an explicit, recorded licensing decision.
- Once an API exists, reuse shared domain and financial behavior from `bluewhale_core` instead of duplicating it in either client.
- A license has not been selected; do not assume one before publishing the repository or accepting contributions.
- Keep the clients independent of closed-source server internals.

## Development guidance

No build, lint, or test commands exist yet. When the first client skeleton lands, add to this file:

- The exact build, lint, test, and single-test commands for each client.
- Supported Windows and Android versions and required SDKs.
- The repository layout and how each client consumes `bluewhale_core`.
- Only the UI, localization, and release conventions that have actually been decided.

Do not invent a stack, architecture, or command set before it is actually decided and recorded here.
