//! Ledger catalog operations: first-run creation, opening, switching, and
//! non-destructive removal.
//!
//! Financial data stays in the per-ledger SQLCipher database. The catalog holds
//! descriptors and the active selection only; keys live in the ledger
//! directory protected by the platform key store.

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};

use clients_platform::{KeyProtectionError, KeyProtector};
use core_application::{
    ApplicationError, Clock, DefaultLedgerContent, IdSource, InitializeLedgerRequest,
    InitializeLedgerUseCase,
};
use core_crypto::SymmetricKey;
use core_domain::{
    CurrencyScalePolicy, LedgerCalendar, LedgerProfile, LedgerProfileRepository,
    LedgerProfileValidationError, LedgerSettings, LedgerSettingsRepository,
};
use core_persistence::SqliteLedger;
use zeroize::Zeroizing;

use crate::catalog::{CatalogStore, LedgerCatalog, LedgerDescriptor};
use crate::clock::{SystemClock, Uuidv7Source};
use crate::error::LedgerError;

/// The maximum ledger-name length in characters, matching the profile rules.
pub const MAXIMUM_NAME_CHARACTERS: usize = 60;

/// The maximum number of characters in a profile emoji, matching the core.
pub const MAXIMUM_EMOJI_CHARACTERS: usize = 16;

/// The maximum number of default categories created with a ledger.
pub const MAXIMUM_DEFAULT_CATEGORIES: usize = 20;

/// Default content created with a new ledger.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DefaultContent {
    /// The name of the default cash account.
    pub cash_account_name: String,
    /// Names of the default expense categories.
    pub expense_category_names: Vec<String>,
    /// Names of the default income categories.
    pub income_category_names: Vec<String>,
}

/// A request to create a ledger on this device.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateLedgerRequest {
    /// The user-facing name.
    pub name: String,
    /// The user-facing emoji.
    pub emoji: String,
    /// The reporting currency code.
    pub currency_code: String,
    /// The IANA time zone identifier.
    pub time_zone_identifier: String,
    /// The default content.
    pub default_content: DefaultContent,
}

/// Why a ledger store cannot be used.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LedgerUnavailable {
    /// The database file is missing.
    MissingDatabase,
    /// The key file is missing.
    MissingKey,
    /// The key cannot be unprotected on this device.
    KeyUnreadable,
    /// The database cannot be opened.
    DatabaseUnreadable,
    /// The database has no ledger settings.
    NotInitialized,
    /// Another local failure.
    Unknown,
}

/// The availability of one ledger.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LedgerStatus {
    /// The store is present and the ledger can be opened.
    Available,
    /// The store is present but cannot be used.
    Unavailable(LedgerUnavailable),
}

/// One ledger in the selector.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LedgerSummary {
    /// The ledger identity.
    pub id: String,
    /// The user-facing name.
    pub name: String,
    /// The user-facing emoji.
    pub emoji: String,
    /// The creation instant as UTC epoch milliseconds.
    pub created_at: i64,
    /// Whether this ledger is selected.
    pub is_active: bool,
    /// Whether the store can be used.
    pub status: LedgerStatus,
    /// The ledger directory, for support and recovery.
    pub data_path: String,
}

/// The selector data.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LedgerList {
    /// The selected ledger, if any.
    pub active_ledger_id: Option<String>,
    /// The ledgers in creation order.
    pub ledgers: Vec<LedgerSummary>,
}

/// The profile of the open ledger.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActiveLedgerProfile {
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
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemovedLedger {
    /// The removed ledger identity.
    pub id: String,
    /// The directory that still holds the database and key files.
    pub data_path: String,
}

struct OpenLedger {
    descriptor: LedgerDescriptor,
    ledger: SqliteLedger,
    profile: LedgerProfile,
    settings: LedgerSettings,
}

/// The ledger catalog and the open ledger, if one is selected.
pub struct LedgerService {
    data_dir: PathBuf,
    store: CatalogStore,
    catalog: LedgerCatalog,
    protector: Box<dyn KeyProtector>,
    clock: SystemClock,
    ids: Uuidv7Source,
    active: Option<OpenLedger>,
    failures: BTreeMap<String, LedgerError>,
    catalog_error: Option<LedgerError>,
}

impl LedgerService {
    /// Opens the service for `data_dir`.
    ///
    /// The catalog is loaded and the active ledger is opened when possible. A
    /// store that cannot be opened is recorded as unavailable instead of
    /// failing startup, so the selector can offer recovery. A catalog that
    /// cannot be parsed is left untouched; `list` and every mutation return the
    /// error until the file is repaired.
    ///
    /// # Errors
    ///
    /// Returns an internal error when the data directory cannot be created.
    pub fn new(
        data_dir: impl Into<PathBuf>,
        protector: Box<dyn KeyProtector>,
    ) -> Result<Self, LedgerError> {
        let data_dir = data_dir.into();
        fs::create_dir_all(data_dir.join("ledgers")).map_err(|_| LedgerError::Internal)?;
        let store = CatalogStore::new(&data_dir);
        let (catalog, catalog_error) = match store.load() {
            Ok(catalog) => (catalog, None),
            Err(error) => (LedgerCatalog::default(), Some(error)),
        };
        let active_descriptor = catalog
            .active_ledger_id
            .as_ref()
            .and_then(|id| catalog.descriptor(id))
            .cloned();
        let mut service = Self {
            data_dir,
            store,
            catalog,
            protector,
            clock: SystemClock,
            ids: Uuidv7Source,
            active: None,
            failures: BTreeMap::new(),
            catalog_error,
        };
        if service.catalog_error.is_none()
            && let Some(descriptor) = active_descriptor
        {
            match service.open_ledger(&descriptor) {
                Ok(open) => service.active = Some(open),
                Err(error) => {
                    service.failures.insert(descriptor.id, error);
                }
            }
        }
        Ok(service)
    }

    /// Returns the data directory.
    #[must_use]
    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    /// Returns the selector data.
    ///
    /// # Errors
    ///
    /// Returns [`LedgerError::CatalogUnreadable`] when the catalog could not be
    /// read at startup.
    pub fn list(&self) -> Result<LedgerList, LedgerError> {
        self.ensure_catalog()?;
        Ok(LedgerList {
            active_ledger_id: self.catalog.active_ledger_id.clone(),
            ledgers: self
                .catalog
                .ledgers
                .iter()
                .map(|descriptor| self.summary(descriptor))
                .collect(),
        })
    }

    /// Returns the profile of the open ledger.
    #[must_use]
    pub fn active_profile(&self) -> Option<ActiveLedgerProfile> {
        self.active.as_ref().map(|open| ActiveLedgerProfile {
            id: open.descriptor.id.clone(),
            name: open.profile.name().to_string(),
            emoji: open.profile.emoji().to_string(),
            currency_code: open.settings.currency().code().to_string(),
            time_zone_identifier: open.settings.calendar().identifier().to_string(),
        })
    }

    /// Returns the open ledger database for the use-case commands that follow.
    #[must_use]
    pub fn active_database(&self) -> Option<&SqliteLedger> {
        self.active.as_ref().map(|open| &open.ledger)
    }

    /// Creates a ledger, initializes its database, and selects it.
    ///
    /// # Errors
    ///
    /// Returns a validation error for invalid input, or a store error when the
    /// ledger cannot be created.
    pub fn create(&mut self, request: CreateLedgerRequest) -> Result<LedgerSummary, LedgerError> {
        self.ensure_catalog()?;
        let name = request.name.trim();
        if name.is_empty() || name.chars().count() > MAXIMUM_NAME_CHARACTERS {
            return Err(LedgerError::InvalidName);
        }
        let emoji = request.emoji.trim();
        if emoji.is_empty() || emoji.chars().count() > MAXIMUM_EMOJI_CHARACTERS {
            return Err(LedgerError::InvalidEmoji);
        }
        if CurrencyScalePolicy::v1()
            .currency(&request.currency_code)
            .is_err()
        {
            return Err(LedgerError::InvalidCurrency);
        }
        if LedgerCalendar::new(&request.time_zone_identifier).is_err() {
            return Err(LedgerError::InvalidTimeZone);
        }
        validate_defaults(&request.default_content)?;

        let id = self.ids.next_uuid().to_string();
        let created_at = self.clock.now().as_millisecond();
        if created_at < 0 {
            return Err(LedgerError::Internal);
        }
        let directory = self.directory(&id);
        fs::create_dir_all(&directory).map_err(|_| LedgerError::Internal)?;

        match self.create_files(name, emoji, &id, &request, created_at) {
            Ok(summary) => Ok(summary),
            Err(error) => {
                let _ = fs::remove_dir_all(&directory);
                Err(error)
            }
        }
    }

    fn create_files(
        &mut self,
        name: &str,
        emoji: &str,
        id: &str,
        request: &CreateLedgerRequest,
        created_at: i64,
    ) -> Result<LedgerSummary, LedgerError> {
        let key = SymmetricKey::generate().map_err(|_| LedgerError::Internal)?;
        let protected = self
            .protector
            .protect(id, key.expose_secret())
            .map_err(map_protection)?;
        write_atomic(&self.key_path(id), &protected)?;

        let hex_key = hex(key.expose_secret());
        let database_path = self.database_path(id);
        let ledger = SqliteLedger::open(&database_path, &hex_key).map_err(|_| {
            LedgerError::DatabaseUnreadable {
                path: database_path.display().to_string(),
            }
        })?;

        let initialization = InitializeLedgerRequest {
            ledger_name: name.to_string(),
            ledger_emoji: emoji.to_string(),
            currency_code: request.currency_code.clone(),
            time_zone_identifier: request.time_zone_identifier.clone(),
            opening_balance_text: String::new(),
            default_content: DefaultLedgerContent {
                cash_account_name: request.default_content.cash_account_name.clone(),
                expense_category_names: request.default_content.expense_category_names.clone(),
                income_category_names: request.default_content.income_category_names.clone(),
            },
        };
        let outcome = InitializeLedgerUseCase::new(
            &ledger,
            CurrencyScalePolicy::v1(),
            &self.clock,
            &self.ids,
        )
        .execute(&initialization)
        .map_err(map_application_error)?;
        if !outcome.did_initialize {
            return Err(LedgerError::Conflict);
        }

        let profile = ledger
            .profile()
            .map_err(|_| LedgerError::Internal)?
            .ok_or(LedgerError::NotInitialized)?;
        let settings = ledger
            .settings()
            .map_err(|_| LedgerError::Internal)?
            .ok_or(LedgerError::NotInitialized)?;
        let descriptor = LedgerDescriptor {
            id: id.to_string(),
            name: profile.name().to_string(),
            emoji: profile.emoji().to_string(),
            created_at,
        };

        let mut next = self.catalog.clone();
        next.ledgers.push(descriptor.clone());
        next.active_ledger_id = Some(id.to_string());
        self.store.save(&next)?;
        self.catalog = next;

        let summary = self.summary(&descriptor);
        self.active = Some(OpenLedger {
            descriptor,
            ledger,
            profile,
            settings,
        });
        self.failures.remove(id);
        Ok(summary)
    }

    /// Opens and selects a ledger, retrying a store that failed before.
    ///
    /// # Errors
    ///
    /// Returns [`LedgerError::NotFound`] for an unknown identifier, or the
    /// reason the store cannot be opened. The previous selection is kept when
    /// opening fails.
    pub fn switch(&mut self, id: &str) -> Result<LedgerSummary, LedgerError> {
        self.ensure_catalog()?;
        let descriptor = self
            .catalog
            .descriptor(id)
            .cloned()
            .ok_or(LedgerError::NotFound)?;
        if self
            .active
            .as_ref()
            .is_some_and(|open| open.descriptor.id == id)
        {
            self.failures.remove(id);
            return Ok(self.summary(&descriptor));
        }

        match self.open_ledger(&descriptor) {
            Ok(open) => {
                let mut next = self.catalog.clone();
                next.active_ledger_id = Some(id.to_string());
                self.store.save(&next)?;
                self.catalog = next;
                let summary = self.summary(&descriptor);
                self.active = Some(open);
                self.failures.remove(id);
                Ok(summary)
            }
            Err(error) => {
                self.failures.insert(id.to_string(), error.clone());
                Err(error)
            }
        }
    }

    /// Removes a ledger from this device without deleting its files.
    ///
    /// # Errors
    ///
    /// Returns [`LedgerError::NotFound`] for an unknown identifier, or a store
    /// error when the catalog cannot be written.
    pub fn remove(&mut self, id: &str) -> Result<RemovedLedger, LedgerError> {
        self.ensure_catalog()?;
        if self.catalog.descriptor(id).is_none() {
            return Err(LedgerError::NotFound);
        }
        let mut next = self.catalog.clone();
        next.ledgers.retain(|descriptor| descriptor.id != id);
        if next.active_ledger_id.as_deref() == Some(id) {
            next.active_ledger_id = None;
        }
        self.store.save(&next)?;
        self.catalog = next;
        if self
            .active
            .as_ref()
            .is_some_and(|open| open.descriptor.id == id)
        {
            self.active = None;
        }
        self.failures.remove(id);
        Ok(RemovedLedger {
            id: id.to_string(),
            data_path: self.directory(id).display().to_string(),
        })
    }

    fn ensure_catalog(&self) -> Result<(), LedgerError> {
        match &self.catalog_error {
            Some(error) => Err(error.clone()),
            None => Ok(()),
        }
    }

    fn open_ledger(&self, descriptor: &LedgerDescriptor) -> Result<OpenLedger, LedgerError> {
        let database_path = self.database_path(&descriptor.id);
        let key_path = self.key_path(&descriptor.id);
        if !database_path.exists() {
            return Err(LedgerError::MissingDatabase {
                path: database_path.display().to_string(),
            });
        }
        if !key_path.exists() {
            return Err(LedgerError::MissingKey {
                path: key_path.display().to_string(),
            });
        }

        let protected = fs::read(&key_path).map_err(|_| LedgerError::KeyUnreadable)?;
        let key = Zeroizing::new(
            self.protector
                .unprotect(&descriptor.id, &protected)
                .map_err(|_| LedgerError::KeyUnreadable)?,
        );
        let hex_key = hex(key.as_slice());
        let ledger = SqliteLedger::open(&database_path, &hex_key).map_err(|_| {
            LedgerError::DatabaseUnreadable {
                path: database_path.display().to_string(),
            }
        })?;
        let settings = ledger
            .settings()
            .map_err(|_| LedgerError::Internal)?
            .ok_or(LedgerError::NotInitialized)?;
        let profile = ledger
            .profile()
            .map_err(|_| LedgerError::Internal)?
            .ok_or(LedgerError::NotInitialized)?;
        Ok(OpenLedger {
            descriptor: descriptor.clone(),
            ledger,
            profile,
            settings,
        })
    }

    fn summary(&self, descriptor: &LedgerDescriptor) -> LedgerSummary {
        LedgerSummary {
            id: descriptor.id.clone(),
            name: descriptor.name.clone(),
            emoji: descriptor.emoji.clone(),
            created_at: descriptor.created_at,
            is_active: self.catalog.active_ledger_id.as_deref() == Some(descriptor.id.as_str()),
            status: self.status(descriptor),
            data_path: self.directory(&descriptor.id).display().to_string(),
        }
    }

    fn status(&self, descriptor: &LedgerDescriptor) -> LedgerStatus {
        if let Some(error) = self.failures.get(&descriptor.id) {
            return LedgerStatus::Unavailable(unavailable_reason(error));
        }
        if !self.database_path(&descriptor.id).exists() {
            return LedgerStatus::Unavailable(LedgerUnavailable::MissingDatabase);
        }
        if !self.key_path(&descriptor.id).exists() {
            return LedgerStatus::Unavailable(LedgerUnavailable::MissingKey);
        }
        LedgerStatus::Available
    }

    fn directory(&self, id: &str) -> PathBuf {
        self.data_dir.join("ledgers").join(id)
    }

    fn database_path(&self, id: &str) -> PathBuf {
        self.directory(id).join("ledger.db")
    }

    fn key_path(&self, id: &str) -> PathBuf {
        self.directory(id).join("ledger.key")
    }
}

fn validate_defaults(defaults: &DefaultContent) -> Result<(), LedgerError> {
    let valid_name = |name: &str| {
        let trimmed = name.trim();
        !trimmed.is_empty() && trimmed.chars().count() <= MAXIMUM_NAME_CHARACTERS
    };
    if !valid_name(&defaults.cash_account_name)
        || defaults.expense_category_names.is_empty()
        || defaults.income_category_names.is_empty()
        || defaults.expense_category_names.len() > MAXIMUM_DEFAULT_CATEGORIES
        || defaults.income_category_names.len() > MAXIMUM_DEFAULT_CATEGORIES
        || !defaults
            .expense_category_names
            .iter()
            .all(|name| valid_name(name))
        || !defaults
            .income_category_names
            .iter()
            .all(|name| valid_name(name))
    {
        return Err(LedgerError::InvalidDefaultContent);
    }
    Ok(())
}

fn map_protection(_: KeyProtectionError) -> LedgerError {
    LedgerError::KeyProtectionFailed
}

fn map_application_error(error: ApplicationError) -> LedgerError {
    match error {
        ApplicationError::Currency(_) => LedgerError::InvalidCurrency,
        ApplicationError::Calendar(_) => LedgerError::InvalidTimeZone,
        ApplicationError::Profile(profile) => match profile {
            LedgerProfileValidationError::InvalidEmoji => LedgerError::InvalidEmoji,
            _ => LedgerError::InvalidName,
        },
        ApplicationError::Account(_)
        | ApplicationError::Category(_)
        | ApplicationError::Transaction(_)
        | ApplicationError::EmptyExpenseCategoryDefaults
        | ApplicationError::EmptyIncomeCategoryDefaults => LedgerError::InvalidDefaultContent,
        _ => LedgerError::Internal,
    }
}

fn unavailable_reason(error: &LedgerError) -> LedgerUnavailable {
    match error {
        LedgerError::MissingDatabase { .. } => LedgerUnavailable::MissingDatabase,
        LedgerError::MissingKey { .. } => LedgerUnavailable::MissingKey,
        LedgerError::KeyUnreadable => LedgerUnavailable::KeyUnreadable,
        LedgerError::DatabaseUnreadable { .. } => LedgerUnavailable::DatabaseUnreadable,
        LedgerError::NotInitialized => LedgerUnavailable::NotInitialized,
        _ => LedgerUnavailable::Unknown,
    }
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), LedgerError> {
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, bytes).map_err(|_| LedgerError::Internal)?;
    fs::rename(&temporary, path).map_err(|_| {
        let _ = fs::remove_file(&temporary);
        LedgerError::Internal
    })
}

fn hex(bytes: &[u8]) -> Zeroizing<String> {
    let mut text = Zeroizing::new(String::with_capacity(bytes.len() * 2));
    for byte in bytes {
        let _ = write!(&mut *text, "{byte:02x}");
    }
    text
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::LedgerError;

    struct FakeProtector;

    impl KeyProtector for FakeProtector {
        fn protect(&self, context: &str, key: &[u8; 32]) -> Result<Vec<u8>, KeyProtectionError> {
            let mut protected = format!("v1:{context}:").into_bytes();
            protected.extend_from_slice(key);
            Ok(protected)
        }

        fn unprotect(
            &self,
            context: &str,
            protected: &[u8],
        ) -> Result<[u8; 32], KeyProtectionError> {
            let prefix = format!("v1:{context}:").into_bytes();
            let Some(rest) = protected.strip_prefix(prefix.as_slice()) else {
                return Err(KeyProtectionError::Failed);
            };
            rest.try_into().map_err(|_| KeyProtectionError::Failed)
        }
    }

    fn service(directory: &tempfile::TempDir) -> LedgerService {
        LedgerService::new(directory.path().to_path_buf(), Box::new(FakeProtector)).unwrap()
    }

    fn request(name: &str) -> CreateLedgerRequest {
        CreateLedgerRequest {
            name: name.to_string(),
            emoji: "🐳".to_string(),
            currency_code: "USD".to_string(),
            time_zone_identifier: "Asia/Shanghai".to_string(),
            default_content: DefaultContent {
                cash_account_name: "Cash".to_string(),
                expense_category_names: vec!["Food".to_string(), "Transport".to_string()],
                income_category_names: vec!["Salary".to_string()],
            },
        }
    }

    #[test]
    fn creating_a_ledger_initializes_the_store_and_selects_it() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);
        let summary = service.create(request("Household")).unwrap();
        assert!(summary.is_active);
        assert_eq!(summary.status, LedgerStatus::Available);

        let list = service.list().unwrap();
        assert_eq!(list.active_ledger_id.as_deref(), Some(summary.id.as_str()));
        assert_eq!(list.ledgers.len(), 1);

        let id = summary.id.clone();
        assert!(service.database_path(&id).exists());
        assert!(service.key_path(&id).exists());

        let profile = service.active_profile().unwrap();
        assert_eq!(profile.name, "Household");
        assert_eq!(profile.emoji, "🐳");
        assert_eq!(profile.currency_code, "USD");
        assert_eq!(profile.time_zone_identifier, "Asia/Shanghai");

        let catalog = fs::read_to_string(CatalogStore::new(directory.path()).path()).unwrap();
        assert!(catalog.contains("Household"));
        assert!(!catalog.contains("v1:"));
    }

    #[test]
    fn reopening_the_service_restores_the_active_ledger() {
        let directory = tempfile::tempdir().unwrap();
        let id = {
            let mut service = service(&directory);
            service.create(request("Household")).unwrap().id
        };
        let service = service(&directory);
        assert_eq!(
            service.list().unwrap().active_ledger_id.as_deref(),
            Some(id.as_str())
        );
        assert_eq!(service.active_profile().unwrap().name, "Household");
    }

    #[test]
    fn switching_changes_the_active_profile() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);
        let household = service.create(request("Household")).unwrap();
        let business = service.create(request("Business")).unwrap();
        assert_eq!(service.active_profile().unwrap().name, "Business");

        let switched = service.switch(&household.id).unwrap();
        assert!(switched.is_active);
        assert_eq!(service.active_profile().unwrap().name, "Household");
        assert_eq!(
            service.list().unwrap().active_ledger_id.as_deref(),
            Some(household.id.as_str())
        );
        assert!(
            !service
                .list()
                .unwrap()
                .ledgers
                .iter()
                .find(|ledger| ledger.id == business.id)
                .unwrap()
                .is_active
        );
    }

    #[test]
    fn a_missing_database_is_unavailable_and_keeps_the_current_selection() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);
        let household = service.create(request("Household")).unwrap();
        let business = service.create(request("Business")).unwrap();
        fs::remove_file(service.database_path(&household.id)).unwrap();

        let list = service.list().unwrap();
        let entry = list
            .ledgers
            .iter()
            .find(|ledger| ledger.id == household.id)
            .unwrap();
        assert_eq!(
            entry.status,
            LedgerStatus::Unavailable(LedgerUnavailable::MissingDatabase)
        );

        assert!(matches!(
            service.switch(&household.id),
            Err(LedgerError::MissingDatabase { .. })
        ));
        assert_eq!(service.active_profile().unwrap().id, business.id);
    }

    fn create_pair(service: &mut LedgerService) -> (LedgerSummary, LedgerSummary) {
        let household = service.create(request("Household")).unwrap();
        let business = service.create(request("Business")).unwrap();
        (household, business)
    }

    fn status_of(list: &LedgerList, id: &str) -> LedgerStatus {
        list.ledgers
            .iter()
            .find(|ledger| ledger.id == id)
            .unwrap()
            .status
    }

    #[test]
    fn a_missing_key_is_unavailable() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);
        let (ledger, _) = create_pair(&mut service);
        fs::remove_file(service.key_path(&ledger.id)).unwrap();
        assert!(matches!(
            service.switch(&ledger.id),
            Err(LedgerError::MissingKey { .. })
        ));
        assert_eq!(
            status_of(&service.list().unwrap(), &ledger.id),
            LedgerStatus::Unavailable(LedgerUnavailable::MissingKey)
        );
    }

    #[test]
    fn an_unreadable_key_is_reported() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);
        let (ledger, _) = create_pair(&mut service);
        fs::write(service.key_path(&ledger.id), b"garbage").unwrap();
        assert_eq!(service.switch(&ledger.id), Err(LedgerError::KeyUnreadable));
        assert_eq!(
            status_of(&service.list().unwrap(), &ledger.id),
            LedgerStatus::Unavailable(LedgerUnavailable::KeyUnreadable)
        );
    }

    #[test]
    fn a_key_for_another_key_is_reported_as_an_unreadable_database() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);
        let (ledger, _) = create_pair(&mut service);
        let other = FakeProtector.protect(&ledger.id, &[9_u8; 32]).unwrap();
        fs::write(service.key_path(&ledger.id), other).unwrap();
        assert!(matches!(
            service.switch(&ledger.id),
            Err(LedgerError::DatabaseUnreadable { .. })
        ));
    }

    #[test]
    fn removing_a_ledger_clears_the_selection_and_keeps_its_files() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);
        let ledger = service.create(request("Household")).unwrap();
        let database = service.database_path(&ledger.id);
        let removed = service.remove(&ledger.id).unwrap();
        assert_eq!(removed.id, ledger.id);
        assert_eq!(service.active_profile().map(|profile| profile.id), None);
        assert_eq!(service.list().unwrap().ledgers.len(), 0);
        assert!(database.exists());
        assert!(Path::new(&removed.data_path).exists());
    }

    #[test]
    fn invalid_input_is_rejected() {
        let directory = tempfile::tempdir().unwrap();
        let mut service = service(&directory);

        let mut bad = request("Household");
        bad.name = "   ".to_string();
        assert_eq!(service.create(bad), Err(LedgerError::InvalidName));

        let mut bad = request("Household");
        bad.name = "x".repeat(MAXIMUM_NAME_CHARACTERS + 1);
        assert_eq!(service.create(bad), Err(LedgerError::InvalidName));

        let mut bad = request("Household");
        bad.emoji = String::new();
        assert_eq!(service.create(bad), Err(LedgerError::InvalidEmoji));

        let mut bad = request("Household");
        bad.currency_code = "ZZZ".to_string();
        assert_eq!(service.create(bad), Err(LedgerError::InvalidCurrency));

        let mut bad = request("Household");
        bad.time_zone_identifier = "Mars/Olympus".to_string();
        assert_eq!(service.create(bad), Err(LedgerError::InvalidTimeZone));

        let mut bad = request("Household");
        bad.default_content.expense_category_names.clear();
        assert_eq!(service.create(bad), Err(LedgerError::InvalidDefaultContent));

        assert!(service.list().unwrap().ledgers.is_empty());
    }

    #[test]
    fn a_corrupt_catalog_is_surfaced_without_being_overwritten() {
        let directory = tempfile::tempdir().unwrap();
        let catalog_path = CatalogStore::new(directory.path()).path().to_path_buf();
        fs::write(&catalog_path, b"{not json").unwrap();
        let mut service =
            LedgerService::new(directory.path().to_path_buf(), Box::new(FakeProtector)).unwrap();
        assert!(matches!(
            service.list(),
            Err(LedgerError::CatalogUnreadable { .. })
        ));
        assert!(matches!(
            service.create(request("Household")),
            Err(LedgerError::CatalogUnreadable { .. })
        ));
        assert_eq!(fs::read(&catalog_path).unwrap(), b"{not json");
    }

    #[test]
    fn startup_with_a_missing_active_store_surfaces_the_failure() {
        let directory = tempfile::tempdir().unwrap();
        let id = {
            let mut service = service(&directory);
            service.create(request("Household")).unwrap().id
        };
        let database = directory.path().join("ledgers").join(&id).join("ledger.db");
        fs::remove_file(database).unwrap();

        let service = service(&directory);
        let list = service.list().unwrap();
        assert_eq!(list.active_ledger_id.as_deref(), Some(id.as_str()));
        assert_eq!(
            list.ledgers[0].status,
            LedgerStatus::Unavailable(LedgerUnavailable::MissingDatabase)
        );
        assert!(service.active_profile().is_none());
    }
}
