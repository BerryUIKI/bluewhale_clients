//! Desktop application entry point.

use std::path::PathBuf;

use clients_platform::KeyProtector;
use clients_runtime::LedgerService;
use tauri::Manager;

/// Runs the Tauri application.
///
/// # Panics
///
/// Panics when the application cannot start; a failure here has no recovery
/// path and is reported by the platform.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(
            |app, _arguments, _directory| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            },
        ))
        .setup(|app| {
            let data_directory = data_directory(app)?;
            let service = LedgerService::new(data_directory, key_protector()?)?;
            app.manage(clients_ipc::AppState::new(service));
            Ok(())
        })
        .invoke_handler(clients_ipc::builder().invoke_handler())
        .run(tauri::generate_context!())
        .expect("Bluewhale desktop failed to start");
}

fn data_directory(app: &tauri::App) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if let Some(path) = std::env::var_os("BLUEWHALE_DATA_DIR") {
        return Ok(PathBuf::from(path));
    }
    Ok(app.path().app_data_dir()?)
}

#[cfg(windows)]
fn key_protector() -> Result<Box<dyn KeyProtector>, Box<dyn std::error::Error>> {
    Ok(Box::new(clients_platform::WindowsKeyProtector))
}

#[cfg(not(windows))]
fn key_protector() -> Result<Box<dyn KeyProtector>, Box<dyn std::error::Error>> {
    Err("the desktop client currently requires Windows".into())
}
