//! Desktop application entry point.

/// Runs the Tauri application.
///
/// # Panics
///
/// Panics when the application cannot start; a failure here has no recovery
/// path and is reported by the platform.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(clients_ipc::builder().invoke_handler())
        .run(tauri::generate_context!())
        .expect("Bluewhale desktop failed to start");
}
