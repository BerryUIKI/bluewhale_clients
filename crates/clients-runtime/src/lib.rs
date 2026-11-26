//! Application services shared by the Bluewhale clients.
//!
//! Composes core use cases into the operations the desktop and Android
//! applications need: ledger selection and isolation, presentation state,
//! sync scheduling, export, and platform ports. It contains no UI framework
//! code and no financial rules of its own.

/// Build and platform information the application shell displays.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppDetails {
    /// The product name from the application package.
    pub name: String,
    /// The application version from the application package.
    pub version: String,
    /// The operating system, such as `windows` or `android`.
    pub os: &'static str,
    /// The processor architecture, such as `x86_64` or `aarch64`.
    pub arch: &'static str,
}

/// Returns the metadata shown by the application shell for this build.
#[must_use]
pub fn app_details(name: impl Into<String>, version: impl Into<String>) -> AppDetails {
    AppDetails {
        name: name.into(),
        version: version.into(),
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn details_carry_the_package_metadata_and_host_platform() {
        let details = app_details("Bluewhale", "0.1.0");
        assert_eq!(details.name, "Bluewhale");
        assert_eq!(details.version, "0.1.0");
        assert!(!details.os.is_empty());
        assert!(!details.arch.is_empty());
    }
}
