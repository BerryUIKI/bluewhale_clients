//! Tauri commands. Handlers validate transport input, call a runtime
//! operation, and map failures to [`CommandError`].

use tauri::{AppHandle, State};

use clients_runtime::transactions as transaction_service;
use clients_runtime::{MasterDataError, TransactionError, master_data};

use crate::ledger::{
    ActiveLedgerProfileDto, AppState, CreateLedgerRequestDto, LedgerListDto, LedgerSummaryDto,
    RemovedLedgerDto, map_ledger_error,
};
use crate::master_data::{
    AccountCreateRequestDto, AccountDto, AccountGroupCreateRequestDto, AccountGroupDto,
    AccountGroupUpdateRequestDto, AccountUpdateRequestDto, CategoryCreateRequestDto, CategoryDto,
    CategoryGroupCreateRequestDto, CategoryGroupDto, CategoryGroupUpdateRequestDto,
    CategoryUpdateRequestDto, CounterpartyCreateRequestDto, CounterpartyDto,
    CounterpartyUpdateRequestDto, MasterDataDto, TagCreateRequestDto, TagDto, TagUpdateRequestDto,
    map_master_data_error,
};
use crate::transactions::{
    TransactionCreateRequestDto, TransactionDto, TransactionListDto, TransactionQueryRequestDto,
    TransactionUpdateRequestDto, map_transaction_error,
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

/// Returns every master-data record of the open ledger.
///
/// # Errors
///
/// Returns [`CommandError`] when no ledger is open or a record cannot be read.
#[tauri::command]
#[specta::specta]
pub fn master_data(state: State<'_, AppState>) -> Result<MasterDataDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, master_data::load)
        .map(MasterDataDto::from)
        .map_err(map_master_data_error)
}

/// Creates an account and its optional opening balance.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn account_create(
    state: State<'_, AppState>,
    request: AccountCreateRequestDto,
) -> Result<AccountDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::create_account(database, request.into())
        })
        .map(AccountDto::from)
        .map_err(map_master_data_error)
}

/// Updates an account without changing its currency.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn account_update(
    state: State<'_, AppState>,
    request: AccountUpdateRequestDto,
) -> Result<AccountDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::update_account(database, request.into())
        })
        .map(AccountDto::from)
        .map_err(map_master_data_error)
}

/// Creates an account group.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn account_group_create(
    state: State<'_, AppState>,
    request: AccountGroupCreateRequestDto,
) -> Result<AccountGroupDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::create_account_group(database, request.into())
        })
        .map(AccountGroupDto::from)
        .map_err(map_master_data_error)
}

/// Updates an account group.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn account_group_update(
    state: State<'_, AppState>,
    request: AccountGroupUpdateRequestDto,
) -> Result<AccountGroupDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::update_account_group(database, request.into())
        })
        .map(AccountGroupDto::from)
        .map_err(map_master_data_error)
}

/// Creates a category group.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn category_group_create(
    state: State<'_, AppState>,
    request: CategoryGroupCreateRequestDto,
) -> Result<CategoryGroupDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::create_category_group(database, request.into())
        })
        .map(CategoryGroupDto::from)
        .map_err(map_master_data_error)
}

/// Updates a category group.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn category_group_update(
    state: State<'_, AppState>,
    request: CategoryGroupUpdateRequestDto,
) -> Result<CategoryGroupDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::update_category_group(database, request.into())
        })
        .map(CategoryGroupDto::from)
        .map_err(map_master_data_error)
}

/// Creates a leaf category.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn category_create(
    state: State<'_, AppState>,
    request: CategoryCreateRequestDto,
) -> Result<CategoryDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::create_category(database, request.into())
        })
        .map(CategoryDto::from)
        .map_err(map_master_data_error)
}

/// Updates a leaf category.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn category_update(
    state: State<'_, AppState>,
    request: CategoryUpdateRequestDto,
) -> Result<CategoryDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::update_category(database, request.into())
        })
        .map(CategoryDto::from)
        .map_err(map_master_data_error)
}

/// Creates a tag.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn tag_create(
    state: State<'_, AppState>,
    request: TagCreateRequestDto,
) -> Result<TagDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::create_tag(database, request.into())
        })
        .map(TagDto::from)
        .map_err(map_master_data_error)
}

/// Updates a tag.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn tag_update(
    state: State<'_, AppState>,
    request: TagUpdateRequestDto,
) -> Result<TagDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::update_tag(database, request.into())
        })
        .map(TagDto::from)
        .map_err(map_master_data_error)
}

/// Creates a counterparty.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn counterparty_create(
    state: State<'_, AppState>,
    request: CounterpartyCreateRequestDto,
) -> Result<CounterpartyDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::create_counterparty(database, request.into())
        })
        .map(CounterpartyDto::from)
        .map_err(map_master_data_error)
}

/// Updates a counterparty.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn counterparty_update(
    state: State<'_, AppState>,
    request: CounterpartyUpdateRequestDto,
) -> Result<CounterpartyDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(MasterDataError::NoActiveLedger, |database| {
            master_data::update_counterparty(database, request.into())
        })
        .map(CounterpartyDto::from)
        .map_err(map_master_data_error)
}

/// Lists transactions matching the query.
///
/// # Errors
///
/// Returns [`CommandError`] for a malformed filter or a store failure.
#[tauri::command]
#[specta::specta]
pub fn transaction_list(
    state: State<'_, AppState>,
    request: TransactionQueryRequestDto,
) -> Result<TransactionListDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(TransactionError::NoActiveLedger, |database| {
            transaction_service::list(database, &request.into())
        })
        .map(|entries| TransactionListDto {
            transactions: entries.into_iter().map(Into::into).collect(),
        })
        .map_err(map_transaction_error)
}

/// Returns one transaction.
///
/// # Errors
///
/// Returns [`CommandError`] when the transaction does not exist or the store
/// fails.
#[tauri::command]
#[specta::specta]
pub fn transaction_get(
    state: State<'_, AppState>,
    transaction_id: String,
) -> Result<TransactionDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(TransactionError::NoActiveLedger, |database| {
            transaction_service::get(database, &transaction_id)
        })
        .map(TransactionDto::from)
        .map_err(map_transaction_error)
}

/// Creates a transaction.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input or a store failure.
#[tauri::command]
#[specta::specta]
pub fn transaction_create(
    state: State<'_, AppState>,
    request: TransactionCreateRequestDto,
) -> Result<TransactionDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(TransactionError::NoActiveLedger, |database| {
            transaction_service::create(database, request.into())
        })
        .map(TransactionDto::from)
        .map_err(map_transaction_error)
}

/// Updates a transaction.
///
/// # Errors
///
/// Returns [`CommandError`] for invalid input, an unusable transaction, or a
/// store failure.
#[tauri::command]
#[specta::specta]
pub fn transaction_update(
    state: State<'_, AppState>,
    request: TransactionUpdateRequestDto,
) -> Result<TransactionDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(TransactionError::NoActiveLedger, |database| {
            transaction_service::update(database, request.into())
        })
        .map(TransactionDto::from)
        .map_err(map_transaction_error)
}

/// Soft-deletes a transaction.
///
/// # Errors
///
/// Returns [`CommandError`] when the transaction does not exist or the store
/// fails.
#[tauri::command]
#[specta::specta]
pub fn transaction_delete(
    state: State<'_, AppState>,
    transaction_id: String,
) -> Result<TransactionDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(TransactionError::NoActiveLedger, |database| {
            transaction_service::set_deleted(database, &transaction_id, true)
        })
        .map(TransactionDto::from)
        .map_err(map_transaction_error)
}

/// Restores a soft-deleted transaction.
///
/// # Errors
///
/// Returns [`CommandError`] when the transaction does not exist or the store
/// fails.
#[tauri::command]
#[specta::specta]
pub fn transaction_restore(
    state: State<'_, AppState>,
    transaction_id: String,
) -> Result<TransactionDto, CommandError> {
    let service = state.lock()?;
    service
        .with_active_database(TransactionError::NoActiveLedger, |database| {
            transaction_service::set_deleted(database, &transaction_id, false)
        })
        .map(TransactionDto::from)
        .map_err(map_transaction_error)
}
