//! Regenerates the committed TypeScript bindings.

fn main() {
    let path =
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/ipc/src/bindings.ts");
    if let Err(error) = clients_ipc::export_bindings(&path) {
        eprintln!("could not export the TypeScript bindings: {error}");
        std::process::exit(1);
    }
    println!("wrote {}", path.display());
}
