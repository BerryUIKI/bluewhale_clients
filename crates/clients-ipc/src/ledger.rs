//! Ledger catalog commands and presentation DTOs.

use std::sync::Mutex;

use clients_runtime::{
    CreateLedgerRequest, DefaultContent, LedgerError, LedgerList, LedgerService, LedgerStatus,
    LedgerSummary, LedgerUnavailable,
};
use serde::Deserialize;

use crate::{CommandError, CommandErrorDetail, ErrorCode};

/// The application state shared by the Tauri commands.
pub struct AppState {
    ledgers: Mutex<LedgerService>,
}

impl AppState {
    /// Creates the state around an open ledger service.
    #[must_use]
    pub fn new(ledgers: LedgerService) -> Self {
        Self {
            ledgers: Mutex::new(ledgers),
        }
    }

    /// Locks the ledger service.
    ///
    /// # Errors
    ///
    /// Returns an internal error when a previous command panicked while
    /// holding the lock.
    pub fn lock(&self) -> Result<std::sync::MutexGuard<'_, LedgerService>, CommandError> {
        self.ledgers
            .lock()
            .map_err(|_| CommandError::internal("errors.ledger_internal"))
    }
}

/// The selector data.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LedgerListDto {
    /// The selected ledger, if any.
    pub active_ledger_id: Option<String>,
    /// The ledgers in creation order.
    pub ledgers: Vec<LedgerSummaryDto>,
}

/// One ledger in the selector.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct LedgerSummaryDto {
    /// The ledger identity.
    pub id: String,
    /// The user-facing name.
    pub name: String,
    /// The user-facing emoji.
    pub emoji: String,
    /// The creation instant as an RFC 3339 UTC timestamp.
    pub created_at: String,
    /// Whether this ledger is selected.
    pub is_active: bool,
    /// Whether the store is usable.
    pub status: LedgerStatusDto,
    /// Why the store is unusable; present only when the status is unavailable.
    pub unavailable_reason: Option<LedgerUnavailableDto>,
    /// The ledger directory, for support and recovery.
    pub data_path: String,
}

/// Whether a ledger store is usable.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum LedgerStatusDto {
    /// The store is present and can be opened.
    Available,
    /// The store is present but cannot be used.
    Unavailable,
}

/// Why a ledger store cannot be used.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum LedgerUnavailableDto {
    /// The database file is missing.
    MissingDatabase,
    /// The key file is missing.
    MissingKey,
    /// The key cannot be unprotected.
    KeyUnreadable,
    /// The database cannot be opened.
    DatabaseUnreadable,
    /// The database has no ledger settings.
    NotInitialized,
    /// Another local failure.
    Unknown,
}

/// A request to create a ledger.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateLedgerRequestDto {
    /// The user-facing name.
    pub name: String,
    /// The user-facing emoji.
    pub emoji: String,
    /// The reporting currency code.
    pub currency_code: String,
    /// The IANA time zone identifier.
    pub time_zone_identifier: String,
    /// The default content, localized by the interface.
    pub default_content: DefaultContentDto,
}

/// Default content created with a ledger.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DefaultContentDto {
    /// The default cash account name.
    pub cash_account_name: String,
    /// The default expense category names.
    pub expense_category_names: Vec<String>,
    /// The default income category names.
    pub income_category_names: Vec<String>,
}

/// The profile of the open ledger.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ActiveLedgerProfileDto {
    /// The ledger identity.
    pub id: String,
    /// The user-facing name.
    pub name: String,
    /// The user-facing emoji.
    pub emoji: String,
    /// The reporting currency code.
    pub currency_code: String,
    /// The IANA time zone identifier.
    pub time_zone_identifier: String,
}

/// The result of removing a ledger from this device.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RemovedLedgerDto {
    /// The removed ledger identity.
    pub id: String,
    /// The directory that still holds the database and key files.
    pub data_path: String,
}

impl From<LedgerList> for LedgerListDto {
    fn from(list: LedgerList) -> Self {
        Self {
            active_ledger_id: list.active_ledger_id,
            ledgers: list.ledgers.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<LedgerSummary> for LedgerSummaryDto {
    fn from(summary: LedgerSummary) -> Self {
        let (status, unavailable_reason) = match summary.status {
            LedgerStatus::Available => (LedgerStatusDto::Available, None),
            LedgerStatus::Unavailable(reason) => {
                (LedgerStatusDto::Unavailable, Some(reason.into()))
            }
        };
        Self {
            id: summary.id,
            name: summary.name,
            emoji: summary.emoji,
            created_at: jiff::Timestamp::from_millisecond(summary.created_at)
                .map(|instant| instant.to_string())
                .unwrap_or_default(),
            is_active: summary.is_active,
            status,
            unavailable_reason,
            data_path: summary.data_path,
        }
    }
}

impl From<LedgerUnavailable> for LedgerUnavailableDto {
    fn from(reason: LedgerUnavailable) -> Self {
        match reason {
            LedgerUnavailable::MissingDatabase => Self::MissingDatabase,
            LedgerUnavailable::MissingKey => Self::MissingKey,
            LedgerUnavailable::KeyUnreadable => Self::KeyUnreadable,
            LedgerUnavailable::DatabaseUnreadable => Self::DatabaseUnreadable,
            LedgerUnavailable::NotInitialized => Self::NotInitialized,
            LedgerUnavailable::Unknown => Self::Unknown,
        }
    }
}

impl From<clients_runtime::ActiveLedgerProfile> for ActiveLedgerProfileDto {
    fn from(profile: clients_runtime::ActiveLedgerProfile) -> Self {
        Self {
            id: profile.id,
            name: profile.name,
            emoji: profile.emoji,
            currency_code: profile.currency_code,
            time_zone_identifier: profile.time_zone_identifier,
        }
    }
}

impl From<CreateLedgerRequestDto> for CreateLedgerRequest {
    fn from(request: CreateLedgerRequestDto) -> Self {
        Self {
            name: request.name,
            emoji: request.emoji,
            currency_code: request.currency_code,
            time_zone_identifier: request.time_zone_identifier,
            default_content: DefaultContent {
                cash_account_name: request.default_content.cash_account_name,
                expense_category_names: request.default_content.expense_category_names,
                income_category_names: request.default_content.income_category_names,
            },
        }
    }
}

pub(crate) fn map_ledger_error(error: LedgerError) -> CommandError {
    let code = match &error {
        LedgerError::InvalidName
        | LedgerError::InvalidEmoji
        | LedgerError::InvalidCurrency
        | LedgerError::InvalidTimeZone
        | LedgerError::InvalidDefaultContent => ErrorCode::InvalidRequest,
        LedgerError::NotFound => ErrorCode::NotFound,
        LedgerError::Conflict => ErrorCode::Conflict,
        LedgerError::MissingDatabase { .. }
        | LedgerError::MissingKey { .. }
        | LedgerError::KeyUnreadable
        | LedgerError::DatabaseUnreadable { .. }
        | LedgerError::NotInitialized => ErrorCode::Unavailable,
        LedgerError::CatalogUnreadable { .. }
        | LedgerError::CatalogWriteFailed
        | LedgerError::KeyProtectionFailed
        | LedgerError::Internal => ErrorCode::Internal,
    };
    let mut mapped = CommandError::new(code, error.message_key());
    if let Some(path) = error.path() {
        mapped = mapped.with_details(vec![CommandErrorDetail {
            field: "path".to_string(),
            message_key: "errors.path".to_string(),
            value: Some(path.to_string()),
        }]);
    }
    mapped
}
