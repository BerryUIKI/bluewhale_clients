# Core pin

The client crates consume `bluewhale_core` from its public repository at a fixed
revision. `Cargo.lock` records the same revision.

| Item        | Value                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned on   | 2026-11-26                                                                                                                                                        |
| Revision    | `7e9cdefb1415f206c653ccc77b1241c9ea9bbce2`                                                                                                                        |
| Tag         | `v0.1.0`, annotated, created 2026-11-26 on the pinned revision.                                                                                                   |
| Crates      | `core-domain`, `core-application`, `core-persistence`, `core-sync`, `core-crypto`, `core-testkit`                                                                 |
| Consumed by | `clients-runtime` (`core-domain`, `core-application`, `core-crypto`, `core-persistence`); the other entries are declared for the sync and test work that follows. |

The six crates are declared once in the workspace `Cargo.toml` under
`[workspace.dependencies]`, each with a caret version, the repository URL, and
the full 40-hex revision. A change to the pin updates this file in the same
change.

## Updating the pin

1. Choose the core commit and confirm its checks pass in `bluewhale_core`.
2. Update the six `rev` values in `Cargo.toml`.
3. Run `cargo update -p core-domain` (and the other five crates) so `Cargo.lock`
   records the new revision.
4. Update the table above with the date, revision, and tag.

## Local co-development

To build against a sibling checkout, create a gitignored `.cargo/local-core.toml`
with a patch whose key matches the dependency source exactly:

```toml
[patch."https://github.com/BerryUIKI/bluewhale_core"]
core-domain = { path = "../bluewhale_core/crates/core-domain" }
core-application = { path = "../bluewhale_core/crates/core-application" }
core-persistence = { path = "../bluewhale_core/crates/core-persistence" }
core-sync = { path = "../bluewhale_core/crates/core-sync" }
core-crypto = { path = "../bluewhale_core/crates/core-crypto" }
core-testkit = { path = "../bluewhale_core/crates/core-testkit" }
```

Run cargo with `cargo --config .cargo/local-core.toml <command>`. The file is
never committed and CI fails when it exists.

## Tag

The annotated tag `v0.1.0` was pushed to `bluewhale_core` on 2026-11-26 and
points at the pinned revision. The pin is by revision, so updating to a later
core commit does not depend on a new tag; record both in the table when either
changes. The crates are not published to crates.io.
