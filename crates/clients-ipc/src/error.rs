//! Stable command error codes shared with the TypeScript bindings.

use std::fmt;

/// A stable machine-readable reason for a failed command.
///
/// The UI maps these codes to localized messages; the codes never change for
/// the same condition, and messages are never localized on the Rust side.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    /// The command conflicts with stored state.
    Conflict,
    /// The caller may not perform the operation.
    Forbidden,
    /// An unexpected failure occurred.
    Internal,
    /// The request is malformed.
    InvalidRequest,
    /// The addressed entity does not exist.
    NotFound,
    /// The desktop runtime or a required service is unavailable.
    Unavailable,
}

impl ErrorCode {
    /// Returns the stable wire name.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Conflict => "conflict",
            Self::Forbidden => "forbidden",
            Self::Internal => "internal",
            Self::InvalidRequest => "invalid_request",
            Self::NotFound => "not_found",
            Self::Unavailable => "unavailable",
        }
    }
}

impl fmt::Display for ErrorCode {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

/// A field-level detail attached to a command error.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, specta::Type)]
pub struct CommandErrorDetail {
    /// The request field this detail refers to.
    pub field: String,
    /// The message key the UI resolves for this field.
    pub message_key: String,
}

/// The typed error returned across the IPC boundary.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, specta::Type)]
pub struct CommandError {
    /// The stable reason.
    pub code: ErrorCode,
    /// The message key the UI resolves locally.
    pub message_key: String,
    /// Optional field-level details, for form feedback.
    pub details: Option<Vec<CommandErrorDetail>>,
}

impl CommandError {
    /// Creates an error with no details.
    #[must_use]
    pub fn new(code: ErrorCode, message_key: impl Into<String>) -> Self {
        Self {
            code,
            message_key: message_key.into(),
            details: None,
        }
    }

    /// Creates an internal error.
    #[must_use]
    pub fn internal(message_key: impl Into<String>) -> Self {
        Self::new(ErrorCode::Internal, message_key)
    }

    /// Returns the error with field-level details.
    #[must_use]
    pub fn with_details(mut self, details: Vec<CommandErrorDetail>) -> Self {
        self.details = Some(details);
        self
    }
}

impl fmt::Display for CommandError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}: {}", self.code, self.message_key)
    }
}

impl std::error::Error for CommandError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codes_use_the_stable_wire_names() {
        assert_eq!(ErrorCode::InvalidRequest.as_str(), "invalid_request");
        assert_eq!(
            serde_json::to_value(ErrorCode::Unavailable).unwrap(),
            serde_json::Value::from("unavailable")
        );
        assert_eq!(ErrorCode::NotFound.to_string(), "not_found");
    }

    #[test]
    fn an_error_serializes_with_optional_details() {
        let error = CommandError::new(ErrorCode::InvalidRequest, "errors.invalid_request");
        let value = serde_json::to_value(&error).unwrap();
        assert_eq!(value["code"], "invalid_request");
        assert_eq!(value["message_key"], "errors.invalid_request");
        assert!(value["details"].is_null());

        let detailed = error.clone().with_details(vec![CommandErrorDetail {
            field: "amount".to_string(),
            message_key: "errors.amount_scale".to_string(),
        }]);
        let value = serde_json::to_value(&detailed).unwrap();
        assert_eq!(value["details"][0]["field"], "amount");
        assert_eq!(error.to_string(), "invalid_request: errors.invalid_request");
        assert!(std::error::Error::source(&detailed).is_none());
    }
}
