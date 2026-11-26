//! Ledger catalog and store failures.

use std::fmt;

/// A failure from a ledger operation.
///
/// The variants are stable reasons; the IPC layer maps each to an error code
/// and a message key. Paths are included for support and recovery screens and
/// never contain financial data.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LedgerError {
    /// The ledger name is empty, too long, or otherwise invalid.
    InvalidName,
    /// The emoji is empty or invalid.
    InvalidEmoji,
    /// The reporting currency is unknown.
    InvalidCurrency,
    /// The time zone is not a known IANA identifier.
    InvalidTimeZone,
    /// The default content for a new ledger is invalid.
    InvalidDefaultContent,
    /// The ledger is not in the catalog.
    NotFound,
    /// The operation conflicts with the current state.
    Conflict,
    /// The catalog file cannot be read or parsed.
    CatalogUnreadable {
        /// The catalog path.
        path: String,
    },
    /// The catalog file cannot be written.
    CatalogWriteFailed,
    /// The ledger database file is missing.
    MissingDatabase {
        /// The database path.
        path: String,
    },
    /// The ledger key file is missing.
    MissingKey {
        /// The key path.
        path: String,
    },
    /// The key file cannot be unprotected on this device.
    KeyUnreadable,
    /// The database cannot be opened, for example after corruption.
    DatabaseUnreadable {
        /// The database path.
        path: String,
    },
    /// The ledger key could not be protected for storage.
    KeyProtectionFailed,
    /// The database opens but has no ledger settings.
    NotInitialized,
    /// An unexpected local failure occurred.
    Internal,
}

impl LedgerError {
    /// Returns the stable message key the interface localizes.
    #[must_use]
    pub const fn message_key(&self) -> &'static str {
        match self {
            Self::InvalidName => "errors.ledger_name",
            Self::InvalidEmoji => "errors.ledger_emoji",
            Self::InvalidCurrency => "errors.ledger_currency",
            Self::InvalidTimeZone => "errors.ledger_time_zone",
            Self::InvalidDefaultContent => "errors.ledger_defaults",
            Self::NotFound => "errors.ledger_not_found",
            Self::Conflict => "errors.ledger_conflict",
            Self::CatalogUnreadable { .. } | Self::CatalogWriteFailed => "errors.ledger_catalog",
            Self::MissingDatabase { .. } => "errors.ledger_missing_database",
            Self::MissingKey { .. } => "errors.ledger_missing_key",
            Self::KeyUnreadable => "errors.ledger_key_unreadable",
            Self::KeyProtectionFailed => "errors.ledger_key_store",
            Self::DatabaseUnreadable { .. } => "errors.ledger_database_unreadable",
            Self::NotInitialized => "errors.ledger_not_initialized",
            Self::Internal => "errors.ledger_internal",
        }
    }

    /// Returns the path attached to the failure, when there is one.
    #[must_use]
    pub fn path(&self) -> Option<&str> {
        match self {
            Self::CatalogUnreadable { path }
            | Self::MissingDatabase { path }
            | Self::MissingKey { path }
            | Self::DatabaseUnreadable { path } => Some(path),
            _ => None,
        }
    }
}

impl fmt::Display for LedgerError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.message_key())
    }
}

impl std::error::Error for LedgerError {}

impl From<core_domain::RepositoryError> for LedgerError {
    fn from(_: core_domain::RepositoryError) -> Self {
        Self::Internal
    }
}
