//! The device-local ledger catalog.
//!
//! The catalog stores ledger descriptors and the active selection only. It
//! never contains financial data, settings, or keys. Writes are atomic
//! (temporary file then rename) so a crash cannot truncate the catalog.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::LedgerError;

/// The catalog schema version.
pub const CATALOG_VERSION: u32 = 1;

/// One ledger known to this device.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LedgerDescriptor {
    /// The ledger identity, equal to the settings record identifier.
    pub id: String,
    /// The user-facing name.
    pub name: String,
    /// The user-facing emoji.
    pub emoji: String,
    /// The creation instant as UTC epoch milliseconds.
    pub created_at: i64,
}

/// The persisted catalog.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LedgerCatalog {
    /// The catalog schema version.
    pub schema_version: u32,
    /// The active ledger, if one is selected.
    #[serde(default)]
    pub active_ledger_id: Option<String>,
    /// Ledger descriptors in creation order.
    #[serde(default)]
    pub ledgers: Vec<LedgerDescriptor>,
}

impl Default for LedgerCatalog {
    fn default() -> Self {
        Self {
            schema_version: CATALOG_VERSION,
            active_ledger_id: None,
            ledgers: Vec::new(),
        }
    }
}

impl LedgerCatalog {
    /// Returns the descriptor for `id`.
    #[must_use]
    pub fn descriptor(&self, id: &str) -> Option<&LedgerDescriptor> {
        self.ledgers.iter().find(|ledger| ledger.id == id)
    }
}

/// Reads and writes the catalog file.
#[derive(Debug, Clone)]
pub struct CatalogStore {
    path: PathBuf,
}

impl CatalogStore {
    /// Creates a store for `data_dir/catalog.json`.
    #[must_use]
    pub fn new(data_dir: &Path) -> Self {
        Self {
            path: data_dir.join("catalog.json"),
        }
    }

    /// Returns the catalog path.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Loads the catalog, returning an empty catalog when the file is absent.
    ///
    /// A stale active selection is cleared so a removed ledger cannot block
    /// startup. Invalid identifiers, duplicate identifiers, and an unsupported
    /// schema version are rejected rather than guessed at.
    ///
    /// # Errors
    ///
    /// Returns [`LedgerError::CatalogUnreadable`] when the file cannot be read
    /// or parsed.
    pub fn load(&self) -> Result<LedgerCatalog, LedgerError> {
        let text = match fs::read_to_string(&self.path) {
            Ok(text) => text,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(LedgerCatalog::default());
            }
            Err(_) => return Err(self.unreadable()),
        };
        let mut catalog: LedgerCatalog =
            serde_json::from_str(&text).map_err(|_| self.unreadable())?;
        if catalog.schema_version != CATALOG_VERSION {
            return Err(self.unreadable());
        }
        let mut seen = std::collections::BTreeSet::new();
        for descriptor in &catalog.ledgers {
            let parsed = Uuid::parse_str(&descriptor.id).map_err(|_| self.unreadable())?;
            if parsed.get_version_num() != 7
                || descriptor.name.trim().is_empty()
                || descriptor.emoji.trim().is_empty()
                || !seen.insert(descriptor.id.clone())
            {
                return Err(self.unreadable());
            }
        }
        if catalog
            .active_ledger_id
            .as_ref()
            .is_some_and(|id| catalog.descriptor(id).is_none())
        {
            catalog.active_ledger_id = None;
        }
        Ok(catalog)
    }

    /// Writes the catalog atomically.
    ///
    /// # Errors
    ///
    /// Returns [`LedgerError::CatalogWriteFailed`] when the file cannot be
    /// written.
    pub fn save(&self, catalog: &LedgerCatalog) -> Result<(), LedgerError> {
        let json =
            serde_json::to_vec_pretty(catalog).map_err(|_| LedgerError::CatalogWriteFailed)?;
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|_| LedgerError::CatalogWriteFailed)?;
        }
        let temporary = self.path.with_extension("json.tmp");
        fs::write(&temporary, json).map_err(|_| LedgerError::CatalogWriteFailed)?;
        fs::rename(&temporary, &self.path).map_err(|_| {
            let _ = fs::remove_file(&temporary);
            LedgerError::CatalogWriteFailed
        })
    }

    fn unreadable(&self) -> LedgerError {
        LedgerError::CatalogUnreadable {
            path: self.path.display().to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_missing_catalog_loads_empty() {
        let directory = tempfile::tempdir().unwrap();
        let store = CatalogStore::new(directory.path());
        assert_eq!(store.load().unwrap(), LedgerCatalog::default());
    }

    #[test]
    fn the_catalog_round_trips() {
        let directory = tempfile::tempdir().unwrap();
        let store = CatalogStore::new(directory.path());
        let id = Uuid::now_v7().to_string();
        let catalog = LedgerCatalog {
            schema_version: CATALOG_VERSION,
            active_ledger_id: Some(id.clone()),
            ledgers: vec![LedgerDescriptor {
                id,
                name: "Household".to_string(),
                emoji: "🏠".to_string(),
                created_at: 1_700_000_000_000,
            }],
        };
        store.save(&catalog).unwrap();
        assert_eq!(store.load().unwrap(), catalog);
    }

    #[test]
    fn a_stale_active_selection_is_cleared() {
        let directory = tempfile::tempdir().unwrap();
        let store = CatalogStore::new(directory.path());
        let catalog = LedgerCatalog {
            active_ledger_id: Some(Uuid::now_v7().to_string()),
            ..LedgerCatalog::default()
        };
        store.save(&catalog).unwrap();
        assert_eq!(store.load().unwrap().active_ledger_id, None);
    }

    #[test]
    fn malformed_or_foreign_catalogs_are_rejected() {
        let directory = tempfile::tempdir().unwrap();
        let store = CatalogStore::new(directory.path());

        fs::write(store.path(), b"{not json").unwrap();
        assert!(matches!(
            store.load(),
            Err(LedgerError::CatalogUnreadable { .. })
        ));

        let unsupported = LedgerCatalog {
            schema_version: CATALOG_VERSION + 1,
            ..LedgerCatalog::default()
        };
        fs::write(store.path(), serde_json::to_vec(&unsupported).unwrap()).unwrap();
        assert!(matches!(
            store.load(),
            Err(LedgerError::CatalogUnreadable { .. })
        ));

        let duplicate = Uuid::now_v7().to_string();
        let mut catalog = LedgerCatalog::default();
        catalog.ledgers.push(LedgerDescriptor {
            id: duplicate.clone(),
            name: "One".to_string(),
            emoji: "🐳".to_string(),
            created_at: 1,
        });
        catalog.ledgers.push(LedgerDescriptor {
            id: duplicate,
            name: "Two".to_string(),
            emoji: "🐳".to_string(),
            created_at: 2,
        });
        fs::write(store.path(), serde_json::to_vec(&catalog).unwrap()).unwrap();
        assert!(matches!(
            store.load(),
            Err(LedgerError::CatalogUnreadable { .. })
        ));

        let mut non_v7 = LedgerCatalog::default();
        non_v7.ledgers.push(LedgerDescriptor {
            id: Uuid::from_u128(7).to_string(),
            name: "Seven".to_string(),
            emoji: "🐳".to_string(),
            created_at: 0,
        });
        fs::write(store.path(), serde_json::to_vec(&non_v7).unwrap()).unwrap();
        assert!(matches!(
            store.load(),
            Err(LedgerError::CatalogUnreadable { .. })
        ));
    }
}
