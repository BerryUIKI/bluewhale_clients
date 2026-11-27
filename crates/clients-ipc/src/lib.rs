//! Tauri command boundary for the Bluewhale clients.
//!
//! Command handlers are thin adapters: they validate transport-level input,
//! call a `clients-runtime` operation, and map errors to stable codes. The
//! TypeScript bindings in `packages/ipc` are generated from these signatures
//! and are committed; `cargo run -p clients-ipc --bin export_bindings`
//! regenerates them, and a test fails when they drift.

pub mod commands;
pub mod dashboard;
mod error;
pub mod ledger;
pub mod master_data;
pub mod transactions;

pub use commands::{
    account_create, account_group_create, account_group_update, account_update, app_info,
    category_create, category_group_create, category_group_update, category_update,
    counterparty_create, counterparty_update, dashboard_load, ledger_active_profile, ledger_create,
    ledger_list, ledger_remove, ledger_switch, master_data, report_category_ranking, tag_create,
    tag_update, transaction_create, transaction_delete, transaction_get, transaction_list,
    transaction_restore, transaction_update,
};
pub use dashboard::{
    AccountBalanceDto, CategoryRankingDto, CategoryRankingRequestDto, CategoryRankingRowDto,
    DashboardDto, DashboardRequestDto, DayCashFlowDto, MissingRateDto, MoneyDto,
};
pub use error::{CommandError, CommandErrorDetail, ErrorCode};
pub use ledger::{
    ActiveLedgerProfileDto, AppState, CreateLedgerRequestDto, DefaultContentDto, LedgerListDto,
    LedgerStatusDto, LedgerSummaryDto, LedgerUnavailableDto, RemovedLedgerDto,
};
pub use master_data::{
    AccountCreateRequestDto, AccountDto, AccountGroupCreateRequestDto, AccountGroupDto,
    AccountGroupUpdateRequestDto, AccountUpdateRequestDto, AssetTypeDto, CategoryCreateRequestDto,
    CategoryDto, CategoryGroupCreateRequestDto, CategoryGroupDto, CategoryGroupUpdateRequestDto,
    CategoryKindDto, CategoryUpdateRequestDto, CounterpartyCreateRequestDto, CounterpartyDto,
    CounterpartyKindDto, CounterpartyUpdateRequestDto, MasterDataDto, TagCreateRequestDto, TagDto,
    TagUpdateRequestDto,
};
pub use transactions::{
    TransactionCreateRequestDto, TransactionDirectionDto, TransactionDto, TransactionKindDto,
    TransactionListDto, TransactionQueryRequestDto, TransactionScopeDto,
    TransactionUpdateRequestDto,
};

/// Build and platform information returned by the `app_info` command.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    /// The product name from the application package.
    pub name: String,
    /// The application version from the application package.
    pub version: String,
    /// The operating system, such as `windows` or `android`.
    pub os: String,
    /// The processor architecture, such as `x86_64` or `aarch64`.
    pub arch: String,
}

impl From<clients_runtime::AppDetails> for AppInfo {
    fn from(details: clients_runtime::AppDetails) -> Self {
        Self {
            name: details.name,
            version: details.version,
            os: details.os.to_string(),
            arch: details.arch.to_string(),
        }
    }
}

/// Returns the typed command builder shared by the desktop application and the
/// bindings exporter.
#[must_use]
pub fn builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            commands::app_info,
            commands::ledger_list,
            commands::ledger_create,
            commands::ledger_switch,
            commands::ledger_remove,
            commands::ledger_active_profile,
            commands::master_data,
            commands::account_create,
            commands::account_update,
            commands::account_group_create,
            commands::account_group_update,
            commands::category_group_create,
            commands::category_group_update,
            commands::category_create,
            commands::category_update,
            commands::tag_create,
            commands::tag_update,
            commands::counterparty_create,
            commands::counterparty_update,
            commands::transaction_list,
            commands::transaction_get,
            commands::transaction_create,
            commands::transaction_update,
            commands::transaction_delete,
            commands::transaction_restore,
            commands::dashboard_load,
            commands::report_category_ranking,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

/// Writes the TypeScript bindings for every command to `path`.
///
/// # Errors
///
/// Returns the export error as text when the file cannot be written.
pub fn export_bindings(path: impl AsRef<std::path::Path>) -> Result<(), String> {
    builder()
        .export(specta_typescript::Typescript::default(), path)
        .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_details_map_to_the_presentation_dto() {
        let info = AppInfo::from(clients_runtime::app_details("Bluewhale", "0.1.0"));
        assert_eq!(info.name, "Bluewhale");
        assert_eq!(info.version, "0.1.0");
        assert!(!info.os.is_empty());
        assert!(!info.arch.is_empty());
    }

    #[test]
    fn generated_bindings_match_the_committed_file() {
        let committed = include_str!("../../../packages/ipc/src/bindings.ts");
        let path =
            std::env::temp_dir().join(format!("bluewhale-bindings-{}.ts", std::process::id()));
        export_bindings(&path).expect("export the TypeScript bindings");
        let generated = std::fs::read_to_string(&path).expect("read the exported bindings");
        let _ = std::fs::remove_file(&path);
        assert_eq!(
            generated, committed,
            "regenerate packages/ipc/src/bindings.ts with `cargo run -p clients-ipc --bin export_bindings`"
        );
    }
}
