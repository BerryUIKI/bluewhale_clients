# Core pin

The client crates consume `bluewhale_core` from its public repository at a fixed
revision. `Cargo.lock` records the same revision.

| Item        | Value                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned on   | 2026-11-27                                                                                                                                                        |
| Revision    | `184f2887bcc60dc6fd140cc3c90cc5c9b5168ff4`                                                                                                                        |
| Tag         | None on this revision; the annotated `v0.1.0` tag remains on the previous integration pin `7e9cdef`.                                                              |
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
points at `7e9cdef`. The pin is by revision; it now follows the tag to include
the category ranking report added in core `184f288`, so no new tag was created
for this pin. Record the revision and tag state in the table when either
changes. The crates are not published to crates.io.
