//! Platform services shared by the Bluewhale clients.
//!
//! The crate isolates operating-system APIs behind small traits so the runtime
//! and its tests never depend on a platform directly. On Windows the ledger
//! database key is protected with the user-scoped Data Protection API, bound to
//! the ledger through additional entropy.

use std::fmt;

#[cfg(windows)]
mod windows;

#[cfg(windows)]
pub use windows::WindowsKeyProtector;

/// Protects and unprotects per-ledger database keys at rest.
///
/// The context binds the protected blob to one ledger, so a key file copied to
/// another ledger directory cannot be unprotected there.
pub trait KeyProtector: Send + Sync {
    /// Protects a 32-byte key for storage.
    ///
    /// # Errors
    ///
    /// Returns [`KeyProtectionError`] when the platform refuses the request.
    fn protect(&self, context: &str, key: &[u8; 32]) -> Result<Vec<u8>, KeyProtectionError>;

    /// Unprotects a stored key.
    ///
    /// # Errors
    ///
    /// Returns [`KeyProtectionError`] when the blob is corrupt, belongs to
    /// another user or machine, or was protected for another context.
    fn unprotect(&self, context: &str, protected: &[u8]) -> Result<[u8; 32], KeyProtectionError>;
}

/// A key could not be protected or unprotected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyProtectionError {
    /// The platform key store is not available on this system.
    Unavailable,
    /// The platform refused the operation or the blob is invalid.
    Failed,
}

impl fmt::Display for KeyProtectionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Unavailable => "the platform key store is unavailable",
            Self::Failed => "the platform could not protect or unprotect the key",
        })
    }
}

impl std::error::Error for KeyProtectionError {}
