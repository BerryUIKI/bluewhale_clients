//! Tauri command boundary for the Bluewhale clients.
//!
//! Command handlers are thin adapters: they validate transport-level input,
//! call a `clients-runtime` operation, and map errors to stable codes. The
//! TypeScript bindings in `packages/ipc` are generated from these signatures.
