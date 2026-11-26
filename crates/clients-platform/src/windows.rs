//! Windows Data Protection API key protection.
//!
//! Keys are protected for the current user, with the ledger identity as
//! additional entropy, and with the UI prompt suppressed.

use windows::Win32::Foundation::{HLOCAL, LocalFree};
use windows::Win32::Security::Cryptography::{
    CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptProtectData, CryptUnprotectData,
};
use windows::core::PCWSTR;

use crate::{KeyProtectionError, KeyProtector};

const KEY_LEN: usize = 32;
const ENTROPY_PREFIX: &[u8] = b"com.berryui.bluewhale/ledger-key/v1:";

/// Protects ledger database keys with the user-scoped Data Protection API.
#[derive(Debug, Default, Clone, Copy)]
pub struct WindowsKeyProtector;

impl KeyProtector for WindowsKeyProtector {
    fn protect(&self, context: &str, key: &[u8; KEY_LEN]) -> Result<Vec<u8>, KeyProtectionError> {
        let entropy = entropy(context);
        protect_blob(key, &entropy)
    }

    fn unprotect(
        &self,
        context: &str,
        protected: &[u8],
    ) -> Result<[u8; KEY_LEN], KeyProtectionError> {
        let entropy = entropy(context);
        unprotect_blob(protected, &entropy)?
            .try_into()
            .map_err(|_| KeyProtectionError::Failed)
    }
}

fn entropy(context: &str) -> Vec<u8> {
    let mut value = ENTROPY_PREFIX.to_vec();
    value.extend_from_slice(context.as_bytes());
    value
}

fn blob(bytes: &[u8]) -> Result<CRYPT_INTEGER_BLOB, KeyProtectionError> {
    Ok(CRYPT_INTEGER_BLOB {
        cbData: u32::try_from(bytes.len()).map_err(|_| KeyProtectionError::Failed)?,
        pbData: bytes.as_ptr().cast_mut(),
    })
}

/// Copies a DPAPI output blob and frees it.
///
/// # Safety
///
/// `output` must be a buffer returned by a successful DPAPI call.
#[allow(unsafe_code)]
unsafe fn take_blob(output: CRYPT_INTEGER_BLOB) -> Vec<u8> {
    unsafe {
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData.cast())));
        bytes
    }
}

#[allow(unsafe_code)]
fn protect_blob(plaintext: &[u8], entropy: &[u8]) -> Result<Vec<u8>, KeyProtectionError> {
    let input = blob(plaintext)?;
    let entropy = blob(entropy)?;
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptProtectData(
            &input,
            PCWSTR::null(),
            Some(&entropy),
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|_| KeyProtectionError::Failed)?;
        Ok(take_blob(output))
    }
}

#[allow(unsafe_code)]
fn unprotect_blob(protected: &[u8], entropy: &[u8]) -> Result<Vec<u8>, KeyProtectionError> {
    let input = blob(protected)?;
    let entropy = blob(entropy)?;
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptUnprotectData(
            &input,
            None,
            Some(&entropy),
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|_| KeyProtectionError::Failed)?;
        Ok(take_blob(output))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protects_and_unprotects_a_key_for_one_context() {
        let protector = WindowsKeyProtector;
        let key = [7_u8; KEY_LEN];
        let protected = protector.protect("ledger-a", &key).unwrap();
        assert_ne!(protected, key);
        assert_eq!(protector.unprotect("ledger-a", &protected).unwrap(), key);
    }

    #[test]
    fn rejects_a_blob_from_another_context() {
        let protector = WindowsKeyProtector;
        let protected = protector.protect("ledger-a", &[9_u8; KEY_LEN]).unwrap();
        assert_eq!(
            protector.unprotect("ledger-b", &protected),
            Err(KeyProtectionError::Failed)
        );
    }

    #[test]
    fn rejects_a_corrupt_blob() {
        let protector = WindowsKeyProtector;
        assert_eq!(
            protector.unprotect("ledger-a", &[1, 2, 3, 4]),
            Err(KeyProtectionError::Failed)
        );
    }
}
