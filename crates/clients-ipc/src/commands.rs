//! Tauri commands. Handlers validate transport input, call a runtime
//! operation, and map failures to [`CommandError`].

use crate::{AppInfo, CommandError};
use tauri::AppHandle;

/// Returns the build and platform information shown by the shell.
///
/// # Errors
///
/// Returns [`CommandError`] when the package metadata is unavailable.
#[tauri::command]
#[specta::specta]
pub fn app_info(app: AppHandle) -> Result<AppInfo, CommandError> {
    let package = app.package_info();
    let details = clients_runtime::app_details(package.name.clone(), package.version.to_string());
    Ok(AppInfo::from(details))
}
