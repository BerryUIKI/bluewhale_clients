# Core pin

The client crates consume `bluewhale_core` from its public repository at a fixed
revision. `Cargo.lock` records the same revision.

| Item        | Value                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned on   | 2026-11-26                                                                                                                                                        |
| Revision    | `7e9cdefb1415f206c653ccc77b1241c9ea9bbce2`                                                                                                                        |
| Tag         | Not yet pushed. `core-v0.1.0` is the intended annotated tag.                                                                                                      |
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

## Pending owner action

P3.2 pins the core revision before the annotated tag is pushed. The tag is a
release-management step: once `core-v0.1.0` exists, record it in the table; no
manifest change is needed because the pin is by revision.
