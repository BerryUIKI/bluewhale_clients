//! Transaction commands and presentation DTOs.
//!
//! Amounts cross the boundary as exact decimal strings with their currency;
//! occurrence times carry both the UTC instant and the ledger-local date and
//! time, so the interface never converts time zones or money itself.

use clients_runtime::TransactionError;
use clients_runtime::transactions::{
    CreateTransactionInput, TransactionDraftInput, TransactionEntry, TransactionQueryInput,
    TransactionScope, UpdateTransactionInput,
};
use core_domain::{Money, TransactionKind};
use serde::{Deserialize, Serialize};

use crate::{CommandError, ErrorCode};

/// The kind of ledger event.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum TransactionKindDto {
    /// An opening balance for an account.
    OpeningBalance,
    /// Money leaving the ledger.
    Expense,
    /// Money entering the ledger.
    Income,
    /// Money moving between two accounts.
    Transfer,
}

/// Which transactions a list returns.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum TransactionScopeDto {
    /// Active transactions.
    #[default]
    Active,
    /// Soft-deleted transactions.
    Deleted,
}

/// The reporting direction of an entry's amount.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum TransactionDirectionDto {
    /// Money leaves the source account.
    Outflow,
    /// Money enters the account.
    Inflow,
    /// Money moves between accounts.
    Neutral,
    /// The initial balance of an account.
    Opening,
}

/// The filter, search, and scope of a transaction list.
#[derive(Debug, Clone, Default, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TransactionQueryRequestDto {
    /// Which transactions to return.
    #[serde(default)]
    pub scope: TransactionScopeDto,
    /// Case- and width-insensitive search text.
    #[serde(default)]
    pub search_text: String,
    /// Restrict to one kind.
    pub kind: Option<TransactionKindDto>,
    /// Restrict to transactions involving one account.
    pub account_id: Option<String>,
    /// Restrict to one category.
    pub category_id: Option<String>,
    /// Restrict to one tag.
    pub tag_id: Option<String>,
    /// Restrict to one counterparty.
    pub counterparty_id: Option<String>,
    /// Inclusive first day in the ledger time zone, `YYYY-MM-DD`.
    pub start_day: Option<String>,
    /// Inclusive last day in the ledger time zone, `YYYY-MM-DD`.
    pub end_day: Option<String>,
}

/// A transaction list.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TransactionListDto {
    /// The matching transactions, newest first.
    pub transactions: Vec<TransactionDto>,
}

/// One transaction prepared for display.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TransactionDto {
    /// The transaction identity.
    pub id: String,
    /// The event kind.
    pub kind: TransactionKindDto,
    /// The reporting direction.
    pub direction: TransactionDirectionDto,
    /// The amount as an exact decimal string.
    pub amount_text: String,
    /// The amount currency code.
    pub currency_code: String,
    /// The amount currency scale.
    pub scale: u8,
    /// The received amount of a cross-currency transfer.
    pub destination_amount_text: Option<String>,
    /// The received amount currency code.
    pub destination_currency_code: Option<String>,
    /// The received amount currency scale.
    pub destination_scale: Option<u8>,
    /// The occurrence instant as RFC 3339.
    pub occurred_at: String,
    /// The occurrence date in the ledger time zone.
    pub occurred_on: String,
    /// The occurrence local time in the ledger time zone, for the editor.
    pub occurred_at_local: String,
    /// The source or single account.
    pub account_id: String,
    /// The transfer destination account.
    pub destination_account_id: Option<String>,
    /// The classifying category.
    pub category_id: Option<String>,
    /// The attached tags.
    pub tag_ids: Vec<String>,
    /// The optional counterparty.
    pub counterparty_id: Option<String>,
    /// The optional note.
    pub note: Option<String>,
    /// Whether the transaction is soft-deleted.
    pub is_deleted: bool,
    /// The creation instant as RFC 3339.
    pub created_at: String,
}

/// A request to create a transaction.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TransactionCreateRequestDto {
    /// The event kind.
    pub kind: TransactionKindDto,
    /// The amount magnitude as entered.
    pub amount_text: String,
    /// The optional destination amount magnitude for transfers.
    pub destination_amount_text: Option<String>,
    /// The occurrence local time in the ledger zone, `YYYY-MM-DDTHH:mm`.
    pub occurred_at: String,
    /// The source or single account identity.
    pub account_id: String,
    /// The transfer destination account identity.
    pub destination_account_id: Option<String>,
    /// The category identity.
    pub category_id: Option<String>,
    /// The tag identities.
    pub tag_ids: Vec<String>,
    /// The counterparty identity.
    pub counterparty_id: Option<String>,
    /// The optional note.
    pub note: Option<String>,
}

/// A request to update a transaction.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TransactionUpdateRequestDto {
    /// The transaction identity.
    pub id: String,
    /// The event kind.
    pub kind: TransactionKindDto,
    /// The amount magnitude as entered.
    pub amount_text: String,
    /// The optional destination amount magnitude for transfers.
    pub destination_amount_text: Option<String>,
    /// The occurrence local time in the ledger zone, `YYYY-MM-DDTHH:mm`.
    pub occurred_at: String,
    /// The source or single account identity.
    pub account_id: String,
    /// The transfer destination account identity.
    pub destination_account_id: Option<String>,
    /// The category identity.
    pub category_id: Option<String>,
    /// The tag identities.
    pub tag_ids: Vec<String>,
    /// The counterparty identity.
    pub counterparty_id: Option<String>,
    /// The optional note.
    pub note: Option<String>,
}

impl From<TransactionKind> for TransactionKindDto {
    fn from(value: TransactionKind) -> Self {
        match value {
            TransactionKind::OpeningBalance => Self::OpeningBalance,
            TransactionKind::Expense => Self::Expense,
            TransactionKind::Income => Self::Income,
            TransactionKind::Transfer => Self::Transfer,
        }
    }
}

impl From<TransactionKindDto> for TransactionKind {
    fn from(value: TransactionKindDto) -> Self {
        match value {
            TransactionKindDto::OpeningBalance => Self::OpeningBalance,
            TransactionKindDto::Expense => Self::Expense,
            TransactionKindDto::Income => Self::Income,
            TransactionKindDto::Transfer => Self::Transfer,
        }
    }
}

impl From<TransactionScopeDto> for TransactionScope {
    fn from(value: TransactionScopeDto) -> Self {
        match value {
            TransactionScopeDto::Active => Self::Active,
            TransactionScopeDto::Deleted => Self::Deleted,
        }
    }
}

impl From<TransactionKind> for TransactionDirectionDto {
    fn from(value: TransactionKind) -> Self {
        match value {
            TransactionKind::Expense => Self::Outflow,
            TransactionKind::Income => Self::Inflow,
            TransactionKind::Transfer => Self::Neutral,
            TransactionKind::OpeningBalance => Self::Opening,
        }
    }
}

impl From<TransactionEntry> for TransactionDto {
    fn from(entry: TransactionEntry) -> Self {
        Self {
            id: entry.id.to_string(),
            kind: entry.kind.into(),
            direction: entry.kind.into(),
            amount_text: money_text(&entry.amount),
            currency_code: entry.amount.currency().code().to_string(),
            scale: entry.amount.currency().scale(),
            destination_amount_text: entry.destination_amount.as_ref().map(money_text),
            destination_currency_code: entry
                .destination_amount
                .as_ref()
                .map(|money| money.currency().code().to_string()),
            destination_scale: entry
                .destination_amount
                .as_ref()
                .map(|money| money.currency().scale()),
            occurred_at: entry.occurred_at.to_string(),
            occurred_on: entry.occurred_on,
            occurred_at_local: entry.occurred_at_local,
            account_id: entry.account_id.to_string(),
            destination_account_id: entry.destination_account_id.map(|id| id.to_string()),
            category_id: entry.category_id.map(|id| id.to_string()),
            tag_ids: entry.tag_ids.iter().map(ToString::to_string).collect(),
            counterparty_id: entry.counterparty_id.map(|id| id.to_string()),
            note: entry.note,
            is_deleted: entry.is_deleted,
            created_at: entry.created_at.to_string(),
        }
    }
}

impl From<TransactionQueryRequestDto> for TransactionQueryInput {
    fn from(request: TransactionQueryRequestDto) -> Self {
        Self {
            scope: request.scope.into(),
            search_text: request.search_text,
            kind: request.kind.map(Into::into),
            account_id: request.account_id,
            category_id: request.category_id,
            tag_id: request.tag_id,
            counterparty_id: request.counterparty_id,
            start_day: request.start_day,
            end_day: request.end_day,
        }
    }
}

impl From<TransactionCreateRequestDto> for CreateTransactionInput {
    fn from(request: TransactionCreateRequestDto) -> Self {
        Self {
            draft: draft_input(
                request.kind,
                request.amount_text,
                request.destination_amount_text,
                request.occurred_at,
                request.account_id,
                request.destination_account_id,
                request.category_id,
                request.tag_ids,
                request.counterparty_id,
                request.note,
            ),
        }
    }
}

impl From<TransactionUpdateRequestDto> for UpdateTransactionInput {
    fn from(request: TransactionUpdateRequestDto) -> Self {
        Self {
            id: request.id,
            draft: draft_input(
                request.kind,
                request.amount_text,
                request.destination_amount_text,
                request.occurred_at,
                request.account_id,
                request.destination_account_id,
                request.category_id,
                request.tag_ids,
                request.counterparty_id,
                request.note,
            ),
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn draft_input(
    kind: TransactionKindDto,
    amount_text: String,
    destination_amount_text: Option<String>,
    occurred_at: String,
    account_id: String,
    destination_account_id: Option<String>,
    category_id: Option<String>,
    tag_ids: Vec<String>,
    counterparty_id: Option<String>,
    note: Option<String>,
) -> TransactionDraftInput {
    TransactionDraftInput {
        kind: kind.into(),
        amount_text,
        destination_amount_text,
        occurred_at,
        account_id,
        destination_account_id,
        category_id,
        tag_ids,
        counterparty_id,
        note,
    }
}

/// Formats minor units as an exact decimal string with the currency scale.
pub(crate) fn money_text(money: &Money) -> String {
    let scale = money.currency().scale() as u32;
    let negative = money.minor_units() < 0;
    let absolute = money.minor_units().unsigned_abs();
    let text = if scale == 0 {
        absolute.to_string()
    } else {
        let divisor = 10_u64.pow(scale);
        format!(
            "{whole}.{fraction:0width$}",
            whole = absolute / divisor,
            fraction = absolute % divisor,
            width = scale as usize
        )
    };
    if negative { format!("-{text}") } else { text }
}

pub(crate) fn map_transaction_error(error: TransactionError) -> CommandError {
    let code = match error {
        TransactionError::NoActiveLedger | TransactionError::NotInitialized => {
            ErrorCode::Unavailable
        }
        TransactionError::InvalidReference
        | TransactionError::InvalidDateTime
        | TransactionError::InvalidDateRange
        | TransactionError::InvalidAmount
        | TransactionError::AmountNotPositive
        | TransactionError::CategoryRequired
        | TransactionError::TransferRules
        | TransactionError::FieldNotAllowed
        | TransactionError::FilterReferenceUnavailable => ErrorCode::InvalidRequest,
        TransactionError::AccountUnavailable
        | TransactionError::DestinationUnavailable
        | TransactionError::CategoryUnavailable
        | TransactionError::TagUnavailable
        | TransactionError::CounterpartyUnavailable
        | TransactionError::Deleted
        | TransactionError::OpeningBalanceReadOnly => ErrorCode::Conflict,
        TransactionError::NotFound => ErrorCode::NotFound,
        TransactionError::Internal => ErrorCode::Internal,
    };
    CommandError::new(code, error.message_key())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn money_text_uses_the_currency_scale() {
        let usd = core_domain::CurrencyScalePolicy::v1()
            .currency("USD")
            .unwrap();
        let jpy = core_domain::CurrencyScalePolicy::v1()
            .currency("JPY")
            .unwrap();
        assert_eq!(money_text(&Money::new(1_234, usd.clone())), "12.34");
        assert_eq!(money_text(&Money::new(5, usd)), "0.05");
        assert_eq!(money_text(&Money::new(1_234, jpy)), "1234");
    }

    #[test]
    fn kinds_and_directions_map_both_ways() {
        for (kind, dto, direction) in [
            (
                TransactionKind::OpeningBalance,
                TransactionKindDto::OpeningBalance,
                TransactionDirectionDto::Opening,
            ),
            (
                TransactionKind::Expense,
                TransactionKindDto::Expense,
                TransactionDirectionDto::Outflow,
            ),
            (
                TransactionKind::Income,
                TransactionKindDto::Income,
                TransactionDirectionDto::Inflow,
            ),
            (
                TransactionKind::Transfer,
                TransactionKindDto::Transfer,
                TransactionDirectionDto::Neutral,
            ),
        ] {
            assert_eq!(TransactionKindDto::from(kind), dto);
            assert_eq!(TransactionKind::from(dto), kind);
            assert_eq!(TransactionDirectionDto::from(kind), direction);
        }
    }

    #[test]
    fn errors_map_to_stable_codes_and_keys() {
        assert_eq!(
            map_transaction_error(TransactionError::NoActiveLedger).code,
            ErrorCode::Unavailable
        );
        assert_eq!(
            map_transaction_error(TransactionError::InvalidAmount).code,
            ErrorCode::InvalidRequest
        );
        assert_eq!(
            map_transaction_error(TransactionError::AccountUnavailable).code,
            ErrorCode::Conflict
        );
        assert_eq!(
            map_transaction_error(TransactionError::NotFound).code,
            ErrorCode::NotFound
        );
        assert_eq!(
            map_transaction_error(TransactionError::Deleted).message_key,
            "errors.transaction_deleted"
        );
        assert_eq!(
            map_transaction_error(TransactionError::Internal).code,
            ErrorCode::Internal
        );
    }
}
