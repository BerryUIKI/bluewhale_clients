//! Tauri commands. Handlers validate transport input, call a runtime
//! operation, and map failures to [`CommandError`].

use tauri::{AppHandle, State};

use crate::ledger::{
    ActiveLedgerProfileDto, AppState, CreateLedgerRequestDto, LedgerListDto, LedgerSummaryDto,
    RemovedLedgerDto, map_ledger_error,
};
use crate::{AppInfo, CommandError};

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

/// Returns the ledger selector data.
///
/// # Errors
///
/// Returns [`CommandError`] when the catalog cannot be read.
#[tauri::command]
#[specta::specta]
pub fn ledger_list(state: State<'_, AppState>) -> Result<LedgerListDto, CommandError> {
    let service = state.lock()?;
    service
        .list()
        .map(LedgerListDto::from)
        .map_err(map_ledger_error)
}

/// Creates a ledger, initializes its database, and selects it.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn ledger_create(
    state: State<'_, AppState>,
    request: CreateLedgerRequestDto,
) -> Result<LedgerSummaryDto, CommandError> {
    let mut service = state.lock()?;
    service
        .create(request.into())
        .map(LedgerSummaryDto::from)
        .map_err(map_ledger_error)
}

/// Opens and selects a ledger.
///
/// # Errors
///
/// Returns [`CommandError`] when the ledger is unknown or its store cannot be
/// opened.
#[tauri::command]
#[specta::specta]
pub fn ledger_switch(
    state: State<'_, AppState>,
    ledger_id: String,
) -> Result<LedgerSummaryDto, CommandError> {
    let mut service = state.lock()?;
    service
        .switch(&ledger_id)
        .map(LedgerSummaryDto::from)
        .map_err(map_ledger_error)
}

/// Removes a ledger from this device without deleting its files.
///
/// # Errors
///
/// Returns [`CommandError`] when the ledger is unknown or the catalog cannot be
/// written.
#[tauri::command]
#[specta::specta]
pub fn ledger_remove(
    state: State<'_, AppState>,
    ledger_id: String,
) -> Result<RemovedLedgerDto, CommandError> {
    let mut service = state.lock()?;
    service
        .remove(&ledger_id)
        .map(|removed| RemovedLedgerDto {
            id: removed.id,
            data_path: removed.data_path,
        })
        .map_err(map_ledger_error)
}

/// Returns the profile of the open ledger, if any.
///
/// # Errors
///
/// Returns [`CommandError`] when the application state is unavailable.
#[tauri::command]
#[specta::specta]
pub fn ledger_active_profile(
    state: State<'_, AppState>,
) -> Result<Option<ActiveLedgerProfileDto>, CommandError> {
    let service = state.lock()?;
    Ok(service.active_profile().map(Into::into))
}
