//! Transaction operations for the open ledger: history, search and filter,
//! create, update, soft delete, and restore.
//!
//! Every mutation composes the approved core use case; the list uses the core
//! filter use case so search and ordering stay identical to the core rules.
//! Occurrence times are interpreted in the ledger time zone, and entries carry
//! the ledger-local date and time for display.

use std::collections::BTreeSet;

use core_application::{
    ApplicationError, CreateTransactionUseCase, FilterTransactionsUseCase,
    SetTransactionDeletedUseCase, TransactionContext, TransactionDraft, TransactionQuery,
    UpdateTransactionUseCase,
};
use core_domain::{
    AccountId, AccountRepository, CategoryGroupRepository, CategoryId, CategoryRepository,
    CounterpartyId, CounterpartyRepository, LedgerSettings, LedgerSettingsRepository, Money, TagId,
    TagRepository, Transaction, TransactionId, TransactionKind, TransactionRepository,
};
use jiff::Timestamp;
use jiff::civil::{Date, DateTime};
use jiff::tz::TimeZone;

use crate::clock::{SystemClock, Uuidv7Source};
use crate::error::TransactionError;

/// The repositories a transaction operation needs.
///
/// `SqliteLedger` implements every trait; tests can use any store that does.
pub trait TransactionStore:
    TransactionRepository
    + LedgerSettingsRepository
    + AccountRepository
    + CategoryRepository
    + CategoryGroupRepository
    + TagRepository
    + CounterpartyRepository
{
}

impl<T> TransactionStore for T where
    T: TransactionRepository
        + LedgerSettingsRepository
        + AccountRepository
        + CategoryRepository
        + CategoryGroupRepository
        + TagRepository
        + CounterpartyRepository
{
}

/// Which transactions a list returns.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TransactionScope {
    /// Active transactions, the history view.
    #[default]
    Active,
    /// Soft-deleted transactions, the recovery view.
    Deleted,
}

/// The filter, search, and scope of a transaction list.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct TransactionQueryInput {
    /// Which transactions to return.
    pub scope: TransactionScope,
    /// Case- and width-insensitive search text.
    pub search_text: String,
    /// Restrict to one kind.
    pub kind: Option<TransactionKind>,
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

/// One transaction prepared for display.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransactionEntry {
    /// The transaction identity.
    pub id: TransactionId,
    /// The event kind.
    pub kind: TransactionKind,
    /// The amount leaving the source account.
    pub amount: Money,
    /// The amount received by the destination account of a transfer.
    pub destination_amount: Option<Money>,
    /// The occurrence instant.
    pub occurred_at: Timestamp,
    /// The occurrence date in the ledger time zone, `YYYY-MM-DD`.
    pub occurred_on: String,
    /// The occurrence local time in the ledger time zone, `YYYY-MM-DDTHH:mm`.
    pub occurred_at_local: String,
    /// The source or single account.
    pub account_id: AccountId,
    /// The transfer destination account.
    pub destination_account_id: Option<AccountId>,
    /// The classifying category.
    pub category_id: Option<CategoryId>,
    /// The attached tags.
    pub tag_ids: Vec<TagId>,
    /// The optional counterparty.
    pub counterparty_id: Option<CounterpartyId>,
    /// The optional note.
    pub note: Option<String>,
    /// Whether the transaction is soft-deleted.
    pub is_deleted: bool,
    /// The creation instant.
    pub created_at: Timestamp,
}

/// The user-provided transaction fields.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TransactionDraftInput {
    /// The event kind.
    pub kind: TransactionKind,
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

/// The request to create a transaction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateTransactionInput {
    /// The transaction fields.
    pub draft: TransactionDraftInput,
}

/// The request to update a transaction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateTransactionInput {
    /// The transaction identity.
    pub id: String,
    /// The transaction fields.
    pub draft: TransactionDraftInput,
}

/// Lists transactions matching the query.
///
/// # Errors
///
/// Returns a validation error for a malformed identifier or day, an inverted
/// range, a stale filter reference, or a store failure.
pub fn list(
    store: &impl TransactionStore,
    input: &TransactionQueryInput,
) -> Result<Vec<TransactionEntry>, TransactionError> {
    let (settings, zone) = settings_and_zone(store)?;
    let context = context(store, &settings)?;
    let query = build_query(input, &zone)?;
    let transactions = match input.scope {
        TransactionScope::Active => store.transactions(false)?,
        TransactionScope::Deleted => store
            .transactions(true)?
            .into_iter()
            .filter(Transaction::is_deleted)
            .collect(),
    };
    let filtered = FilterTransactionsUseCase::new()
        .execute(&transactions, &context, &query)
        .map_err(map_application_error)?;
    Ok(filtered
        .iter()
        .map(|transaction| entry(transaction, &zone))
        .collect())
}

/// Returns one transaction, including a soft-deleted one.
///
/// # Errors
///
/// Returns [`TransactionError::NotFound`] for an unknown transaction or a store
/// failure.
pub fn get(store: &impl TransactionStore, id: &str) -> Result<TransactionEntry, TransactionError> {
    let (_, zone) = settings_and_zone(store)?;
    let id = parse_id::<TransactionId>(id)?;
    let transaction = store.transaction(id)?.ok_or(TransactionError::NotFound)?;
    Ok(entry(&transaction, &zone))
}

/// Creates a transaction.
///
/// # Errors
///
/// Returns a validation error for invalid references, amounts, dates, or
/// kind-specific fields, or a store failure.
pub fn create(
    store: &impl TransactionStore,
    input: CreateTransactionInput,
) -> Result<TransactionEntry, TransactionError> {
    let (_, zone) = settings_and_zone(store)?;
    let occurred_at = parse_local_datetime(&input.draft.occurred_at, &zone)?;
    let draft = draft(&input.draft, occurred_at)?;
    let transaction =
        CreateTransactionUseCase::new(store, store, store, store, &SystemClock, &Uuidv7Source)
            .with_tags(store)
            .with_counterparties(store)
            .execute(&draft)
            .map_err(map_application_error)?;
    Ok(entry(&transaction, &zone))
}

/// Updates an active transaction. Opening balances cannot be edited.
///
/// # Errors
///
/// Returns a validation error for invalid references, amounts, dates, or
/// kind-specific fields, [`TransactionError::NotFound`] or
/// [`TransactionError::Deleted`] for unusable transactions, or a store failure.
pub fn update(
    store: &impl TransactionStore,
    input: UpdateTransactionInput,
) -> Result<TransactionEntry, TransactionError> {
    let (_, zone) = settings_and_zone(store)?;
    let id = parse_id::<TransactionId>(&input.id)?;
    let occurred_at = parse_local_datetime(&input.draft.occurred_at, &zone)?;
    let draft = draft(&input.draft, occurred_at)?;
    let transaction =
        UpdateTransactionUseCase::new(store, store, store, store, &SystemClock, &Uuidv7Source)
            .with_tags(store)
            .with_counterparties(store)
            .execute(id, &draft)
            .map_err(map_application_error)?;
    Ok(entry(&transaction, &zone))
}

/// Soft-deletes or restores a transaction.
///
/// # Errors
///
/// Returns [`TransactionError::NotFound`] for an unknown transaction or a store
/// failure.
pub fn set_deleted(
    store: &impl TransactionStore,
    id: &str,
    is_deleted: bool,
) -> Result<TransactionEntry, TransactionError> {
    let (_, zone) = settings_and_zone(store)?;
    let id = parse_id::<TransactionId>(id)?;
    let transaction = SetTransactionDeletedUseCase::new(store, &SystemClock)
        .execute(id, is_deleted)
        .map_err(map_application_error)?;
    Ok(entry(&transaction, &zone))
}

fn settings_and_zone(
    store: &impl LedgerSettingsRepository,
) -> Result<(LedgerSettings, TimeZone), TransactionError> {
    let settings = store.settings()?.ok_or(TransactionError::NotInitialized)?;
    let zone =
        TimeZone::get(settings.calendar().identifier()).map_err(|_| TransactionError::Internal)?;
    Ok((settings, zone))
}

fn context(
    store: &impl TransactionStore,
    settings: &LedgerSettings,
) -> Result<TransactionContext, TransactionError> {
    Ok(TransactionContext {
        settings: settings.clone(),
        accounts: store.accounts(true)?,
        categories: store.categories(true)?,
        category_groups: store.category_groups(true)?,
        tags: store.tags(true)?,
        counterparties: store.counterparties(true)?,
    })
}

fn build_query(
    input: &TransactionQueryInput,
    zone: &TimeZone,
) -> Result<TransactionQuery, TransactionError> {
    Ok(TransactionQuery {
        search_text: input.search_text.clone(),
        kind: input.kind,
        account_id: parse_optional_id(input.account_id.as_deref())?,
        category_id: parse_optional_id(input.category_id.as_deref())?,
        tag_id: parse_optional_id(input.tag_id.as_deref())?,
        counterparty_id: parse_optional_id(input.counterparty_id.as_deref())?,
        start_day: parse_day(input.start_day.as_deref(), zone)?,
        end_day: parse_day(input.end_day.as_deref(), zone)?,
    })
}

fn draft(
    input: &TransactionDraftInput,
    occurred_at: Timestamp,
) -> Result<TransactionDraft, TransactionError> {
    Ok(TransactionDraft {
        kind: input.kind,
        amount_text: input.amount_text.clone(),
        destination_amount_text: input.destination_amount_text.clone(),
        occurred_at,
        account_id: parse_id(&input.account_id)?,
        destination_account_id: parse_optional_id(input.destination_account_id.as_deref())?,
        category_id: parse_optional_id(input.category_id.as_deref())?,
        tag_ids: parse_id_set(&input.tag_ids)?,
        counterparty_id: parse_optional_id(input.counterparty_id.as_deref())?,
        note: input.note.clone(),
    })
}

pub(crate) fn entry(transaction: &Transaction, zone: &TimeZone) -> TransactionEntry {
    let zoned = transaction.occurred_at().to_zoned_datetime(zone.clone());
    let date = zoned.date();
    let time = zoned.time();
    let occurred_on = format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day());
    let occurred_at_local = format!("{occurred_on}T{:02}:{:02}", time.hour(), time.minute());
    TransactionEntry {
        id: transaction.id(),
        kind: transaction.kind(),
        amount: transaction.amount().clone(),
        destination_amount: transaction.fields().destination_amount.clone(),
        occurred_at: transaction.occurred_at(),
        occurred_on,
        occurred_at_local,
        account_id: transaction.account_id(),
        destination_account_id: transaction.fields().destination_account_id,
        category_id: transaction.fields().category_id,
        tag_ids: transaction.fields().tag_ids.iter().copied().collect(),
        counterparty_id: transaction.fields().counterparty_id,
        note: transaction.fields().note.clone(),
        is_deleted: transaction.is_deleted(),
        created_at: transaction.created_at(),
    }
}

fn parse_id<T: std::str::FromStr>(value: &str) -> Result<T, TransactionError> {
    value
        .trim()
        .parse()
        .map_err(|_| TransactionError::InvalidReference)
}

fn parse_optional_id<T: std::str::FromStr>(
    value: Option<&str>,
) -> Result<Option<T>, TransactionError> {
    value
        .filter(|value| !value.trim().is_empty())
        .map(parse_id)
        .transpose()
}

fn parse_id_set<T: std::str::FromStr + Ord>(
    values: &[String],
) -> Result<BTreeSet<T>, TransactionError> {
    values
        .iter()
        .map(|value| parse_id(value))
        .collect::<Result<BTreeSet<T>, TransactionError>>()
}

fn parse_day(value: Option<&str>, zone: &TimeZone) -> Result<Option<Timestamp>, TransactionError> {
    value
        .filter(|value| !value.trim().is_empty())
        .map(|value| {
            let date: Date = value
                .trim()
                .parse()
                .map_err(|_| TransactionError::InvalidDateRange)?;
            date.at(12, 0, 0, 0)
                .to_zoned_datetime(zone.clone())
                .map(|zoned| zoned.timestamp())
                .map_err(|_| TransactionError::InvalidDateRange)
        })
        .transpose()
}

fn parse_local_datetime(value: &str, zone: &TimeZone) -> Result<Timestamp, TransactionError> {
    let trimmed = value.trim();
    let normalized = if trimmed.len() == 16 {
        format!("{trimmed}:00")
    } else {
        trimmed.to_string()
    };
    let datetime: DateTime = normalized
        .parse()
        .map_err(|_| TransactionError::InvalidDateTime)?;
    datetime
        .to_zoned_datetime(zone.clone())
        .map(|zoned| zoned.timestamp())
        .map_err(|_| TransactionError::InvalidDateTime)
}

fn map_application_error(error: ApplicationError) -> TransactionError {
    match error {
        ApplicationError::LedgerNotInitialized => TransactionError::NotInitialized,
        ApplicationError::Amount(_) => TransactionError::InvalidAmount,
        ApplicationError::Transaction(
            core_domain::TransactionValidationError::AmountMustBePositive
            | core_domain::TransactionValidationError::DestinationAmountMustBePositive,
        ) => TransactionError::AmountNotPositive,
        ApplicationError::Transaction(
            core_domain::TransactionValidationError::CategoryRequired,
        ) => TransactionError::CategoryRequired,
        ApplicationError::Transaction(
            core_domain::TransactionValidationError::CategoryNotAllowed
            | core_domain::TransactionValidationError::DestinationAccountNotAllowed
            | core_domain::TransactionValidationError::DestinationAmountNotAllowed
            | core_domain::TransactionValidationError::CounterpartyNotAllowed,
        )
        | ApplicationError::DestinationAmountNotAllowed => TransactionError::FieldNotAllowed,
        ApplicationError::Transaction(
            core_domain::TransactionValidationError::DestinationAccountRequired
            | core_domain::TransactionValidationError::TransferAccountsMustDiffer,
        )
        | ApplicationError::DestinationAmountRequired
        | ApplicationError::SameCurrencyTransferAmountsMustMatch => TransactionError::TransferRules,
        ApplicationError::AccountNotFound(_) | ApplicationError::AccountArchived(_) => {
            TransactionError::AccountUnavailable
        }
        ApplicationError::DestinationAccountNotFound(_)
        | ApplicationError::DestinationAccountArchived(_) => {
            TransactionError::DestinationUnavailable
        }
        ApplicationError::CategoryNotFound(_)
        | ApplicationError::CategoryArchived(_)
        | ApplicationError::CategoryKindMismatch { .. } => TransactionError::CategoryUnavailable,
        ApplicationError::TagNotFound(_)
        | ApplicationError::TagArchived(_)
        | ApplicationError::TagRepositoryUnavailable => TransactionError::TagUnavailable,
        ApplicationError::CounterpartyNotFound(_)
        | ApplicationError::CounterpartyArchived(_)
        | ApplicationError::CounterpartyRepositoryUnavailable => {
            TransactionError::CounterpartyUnavailable
        }
        ApplicationError::TransactionNotFound(_) => TransactionError::NotFound,
        ApplicationError::TransactionDeleted(_) => TransactionError::Deleted,
        ApplicationError::OpeningBalanceKindCannotChange(_)
        | ApplicationError::UnsupportedEntryKind(_) => TransactionError::OpeningBalanceReadOnly,
        ApplicationError::InvertedDateRange => TransactionError::InvalidDateRange,
        ApplicationError::Calendar(_) => TransactionError::InvalidDateTime,
        ApplicationError::SelectedAccountNotFound(_)
        | ApplicationError::SelectedCategoryNotFound(_)
        | ApplicationError::SelectedTagNotFound(_)
        | ApplicationError::SelectedCounterpartyNotFound(_) => {
            TransactionError::FilterReferenceUnavailable
        }
        _ => TransactionError::Internal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::master_data;
    use core_application::{
        DefaultLedgerContent, InitializeLedgerRequest, InitializeLedgerUseCase,
    };
    use core_domain::{AssetAccountType, CurrencyScalePolicy};
    use core_persistence::SqliteLedger;

    fn store() -> SqliteLedger {
        let ledger = SqliteLedger::open_in_memory(&"33".repeat(32)).unwrap();
        let outcome = InitializeLedgerUseCase::new(
            &ledger,
            CurrencyScalePolicy::v1(),
            &SystemClock,
            &Uuidv7Source,
        )
        .execute(&InitializeLedgerRequest {
            ledger_name: "Household".to_string(),
            ledger_emoji: "🐳".to_string(),
            currency_code: "CNY".to_string(),
            time_zone_identifier: "Asia/Shanghai".to_string(),
            opening_balance_text: String::new(),
            default_content: DefaultLedgerContent {
                cash_account_name: "Cash".to_string(),
                expense_category_names: vec!["Food".to_string(), "Transport".to_string()],
                income_category_names: vec!["Salary".to_string()],
            },
        })
        .unwrap();
        assert!(outcome.did_initialize);
        ledger
    }

    fn cash(store: &SqliteLedger) -> String {
        master_data::load(store)
            .unwrap()
            .accounts
            .into_iter()
            .find(|account| account.name == "Cash")
            .unwrap()
            .id
            .to_string()
    }

    fn category(store: &SqliteLedger, name: &str) -> String {
        master_data::load(store)
            .unwrap()
            .categories
            .into_iter()
            .find(|category| category.name == name)
            .unwrap()
            .id
            .to_string()
    }

    fn draft(
        kind: TransactionKind,
        amount: &str,
        occurred_at: &str,
        account_id: &str,
    ) -> TransactionDraftInput {
        TransactionDraftInput {
            kind,
            amount_text: amount.to_string(),
            destination_amount_text: None,
            occurred_at: occurred_at.to_string(),
            account_id: account_id.to_string(),
            destination_account_id: None,
            category_id: None,
            tag_ids: Vec::new(),
            counterparty_id: None,
            note: None,
        }
    }

    fn create(store: &SqliteLedger, draft: TransactionDraftInput) -> TransactionEntry {
        create_transaction(store, CreateTransactionInput { draft }).unwrap()
    }

    fn create_transaction(
        store: &SqliteLedger,
        input: CreateTransactionInput,
    ) -> Result<TransactionEntry, TransactionError> {
        super::create(store, input)
    }

    #[test]
    fn creating_an_expense_records_the_ledger_local_time() {
        let store = store();
        let account = cash(&store);
        let food = category(&store, "Food");
        let mut input = draft(
            TransactionKind::Expense,
            "12.34",
            "2026-11-27T09:30",
            &account,
        );
        input.category_id = Some(food.clone());
        input.note = Some("  Lunch  ".to_string());

        let entry = create(&store, input);

        assert_eq!(entry.kind, TransactionKind::Expense);
        assert_eq!(entry.amount.minor_units(), 1_234);
        assert_eq!(entry.amount.currency().code(), "CNY");
        assert_eq!(entry.occurred_on, "2026-11-27");
        assert_eq!(entry.occurred_at_local, "2026-11-27T09:30");
        assert_eq!(
            entry.occurred_at,
            "2026-11-27T01:30:00Z".parse::<Timestamp>().unwrap()
        );
        assert_eq!(entry.note.as_deref(), Some("Lunch"));
        assert_eq!(entry.category_id, Some(food.parse().unwrap()));
        assert!(!entry.is_deleted);
    }

    #[test]
    fn income_and_expense_carry_tags_and_a_counterparty() {
        let store = store();
        let account = cash(&store);
        let salary = category(&store, "Salary");
        let tag = master_data::create_tag(
            &store,
            master_data::CreateTagInput {
                name: "Work".to_string(),
                color_hex: "#112233".to_string(),
                description: None,
            },
        )
        .unwrap();
        let alex = master_data::create_counterparty(
            &store,
            master_data::CreateCounterpartyInput {
                kind: core_domain::CounterpartyKind::Person,
                name: "Alex".to_string(),
            },
        )
        .unwrap();
        let mut input = draft(
            TransactionKind::Income,
            "5000.00",
            "2026-11-27T10:00",
            &account,
        );
        input.category_id = Some(salary);
        input.tag_ids = vec![tag.id.to_string()];
        input.counterparty_id = Some(alex.id.to_string());

        let entry = create(&store, input);

        assert_eq!(entry.kind, TransactionKind::Income);
        assert_eq!(entry.amount.minor_units(), 500_000);
        assert_eq!(entry.tag_ids, vec![tag.id]);
        assert_eq!(entry.counterparty_id, Some(alex.id));
    }

    #[test]
    fn cross_currency_transfers_store_both_sides() {
        let store = store();
        let source = cash(&store);
        let destination = master_data::create_account(
            &store,
            master_data::CreateAccountInput {
                name: "Dollar savings".to_string(),
                asset_type: AssetAccountType::Savings,
                currency_code: "USD".to_string(),
                opening_balance_text: None,
                tag_ids: Vec::new(),
                owner_id: None,
                custom_group_id: None,
                note: String::new(),
                is_hidden: false,
                is_included_in_net_worth: true,
            },
        )
        .unwrap();
        let mut input = draft(
            TransactionKind::Transfer,
            "100.00",
            "2026-11-27T11:00",
            &source,
        );
        input.destination_account_id = Some(destination.id.to_string());

        assert_eq!(
            create_transaction(
                &store,
                CreateTransactionInput {
                    draft: input.clone()
                }
            )
            .unwrap_err(),
            TransactionError::TransferRules
        );

        input.destination_amount_text = Some("14.20".to_string());
        let entry = create(&store, input);
        assert_eq!(entry.amount.minor_units(), 10_000);
        assert_eq!(
            entry.destination_amount.as_ref().unwrap().minor_units(),
            1_420
        );
        assert_eq!(
            entry.destination_amount.as_ref().unwrap().currency().code(),
            "USD"
        );
        assert_eq!(entry.destination_account_id, Some(destination.id));
    }

    #[test]
    fn same_currency_transfers_must_match() {
        let store = store();
        let source = cash(&store);
        let destination = master_data::create_account(
            &store,
            master_data::CreateAccountInput {
                name: "Wallet".to_string(),
                asset_type: AssetAccountType::Cash,
                currency_code: "CNY".to_string(),
                opening_balance_text: None,
                tag_ids: Vec::new(),
                owner_id: None,
                custom_group_id: None,
                note: String::new(),
                is_hidden: false,
                is_included_in_net_worth: true,
            },
        )
        .unwrap();
        let mut input = draft(
            TransactionKind::Transfer,
            "100.00",
            "2026-11-27T11:00",
            &source,
        );
        input.destination_account_id = Some(destination.id.to_string());
        input.destination_amount_text = Some("99.00".to_string());
        assert_eq!(
            create_transaction(
                &store,
                CreateTransactionInput {
                    draft: input.clone()
                }
            )
            .unwrap_err(),
            TransactionError::TransferRules
        );

        input.destination_amount_text = Some("100.00".to_string());
        let entry = create(&store, input);
        assert_eq!(
            entry.destination_amount.as_ref().unwrap().minor_units(),
            10_000
        );
    }

    #[test]
    fn updating_preserves_identity_and_created_at() {
        let store = store();
        let account = cash(&store);
        let food = category(&store, "Food");
        let transport = category(&store, "Transport");
        let mut input = draft(
            TransactionKind::Expense,
            "12.34",
            "2026-11-27T09:30",
            &account,
        );
        input.category_id = Some(food);
        let created = create(&store, input);

        let updated = update(
            &store,
            UpdateTransactionInput {
                id: created.id.to_string(),
                draft: TransactionDraftInput {
                    kind: TransactionKind::Expense,
                    amount_text: "20.00".to_string(),
                    destination_amount_text: None,
                    occurred_at: "2026-11-28T18:15".to_string(),
                    account_id: account,
                    destination_account_id: None,
                    category_id: Some(transport),
                    tag_ids: Vec::new(),
                    counterparty_id: None,
                    note: Some("Dinner".to_string()),
                },
            },
        )
        .unwrap();

        assert_eq!(updated.id, created.id);
        assert_eq!(
            updated.created_at.as_millisecond(),
            created.created_at.as_millisecond()
        );
        assert_eq!(updated.amount.minor_units(), 2_000);
        assert_eq!(updated.occurred_on, "2026-11-28");
        assert_eq!(updated.note.as_deref(), Some("Dinner"));
    }

    #[test]
    fn soft_delete_and_restore_move_between_scopes() {
        let store = store();
        let account = cash(&store);
        let food = category(&store, "Food");
        let mut input = draft(
            TransactionKind::Expense,
            "12.34",
            "2026-11-27T09:30",
            &account,
        );
        input.category_id = Some(food);
        let created = create(&store, input);

        let deleted = set_deleted(&store, &created.id.to_string(), true).unwrap();
        assert!(deleted.is_deleted);
        assert!(
            list(&store, &TransactionQueryInput::default())
                .unwrap()
                .is_empty()
        );
        let recovery = list(
            &store,
            &TransactionQueryInput {
                scope: TransactionScope::Deleted,
                ..TransactionQueryInput::default()
            },
        )
        .unwrap();
        assert_eq!(recovery.len(), 1);
        assert!(matches!(
            update(
                &store,
                UpdateTransactionInput {
                    id: created.id.to_string(),
                    draft: TransactionDraftInput {
                        kind: TransactionKind::Expense,
                        amount_text: "13.00".to_string(),
                        destination_amount_text: None,
                        occurred_at: "2026-11-27T09:30".to_string(),
                        account_id: account,
                        destination_account_id: None,
                        category_id: None,
                        tag_ids: Vec::new(),
                        counterparty_id: None,
                        note: None,
                    },
                }
            ),
            Err(TransactionError::Deleted)
        ));

        let restored = set_deleted(&store, &created.id.to_string(), false).unwrap();
        assert!(!restored.is_deleted);
        assert_eq!(
            list(&store, &TransactionQueryInput::default())
                .unwrap()
                .len(),
            1
        );
        assert!(
            list(
                &store,
                &TransactionQueryInput {
                    scope: TransactionScope::Deleted,
                    ..TransactionQueryInput::default()
                }
            )
            .unwrap()
            .is_empty()
        );
    }

    #[test]
    fn opening_balances_are_listed_but_not_editable() {
        let store = store();
        let account = master_data::create_account(
            &store,
            master_data::CreateAccountInput {
                name: "Savings".to_string(),
                asset_type: AssetAccountType::Savings,
                currency_code: "CNY".to_string(),
                opening_balance_text: Some("250.00".to_string()),
                tag_ids: Vec::new(),
                owner_id: None,
                custom_group_id: None,
                note: String::new(),
                is_hidden: false,
                is_included_in_net_worth: true,
            },
        )
        .unwrap();
        let entries = list(&store, &TransactionQueryInput::default()).unwrap();
        let opening = entries
            .iter()
            .find(|entry| entry.kind == TransactionKind::OpeningBalance)
            .unwrap();
        assert_eq!(opening.amount.minor_units(), 25_000);

        assert_eq!(
            update(
                &store,
                UpdateTransactionInput {
                    id: opening.id.to_string(),
                    draft: TransactionDraftInput {
                        kind: TransactionKind::Expense,
                        amount_text: "1.00".to_string(),
                        destination_amount_text: None,
                        occurred_at: "2026-11-27T09:30".to_string(),
                        account_id: account.id.to_string(),
                        destination_account_id: None,
                        category_id: None,
                        tag_ids: Vec::new(),
                        counterparty_id: None,
                        note: None,
                    },
                },
            )
            .unwrap_err(),
            TransactionError::OpeningBalanceReadOnly
        );
        let deleted = set_deleted(&store, &opening.id.to_string(), true).unwrap();
        assert!(deleted.is_deleted);
        let restored = set_deleted(&store, &opening.id.to_string(), false).unwrap();
        assert!(!restored.is_deleted);
    }

    #[test]
    fn listing_filters_by_kind_search_account_and_day() {
        let store = store();
        let account = cash(&store);
        let food = category(&store, "Food");
        let salary = category(&store, "Salary");
        let mut lunch = draft(
            TransactionKind::Expense,
            "12.34",
            "2026-11-27T09:30",
            &account,
        );
        lunch.category_id = Some(food);
        lunch.note = Some("Lunch with Alex".to_string());
        create(&store, lunch);
        let mut income = draft(
            TransactionKind::Income,
            "5000.00",
            "2026-11-28T10:00",
            &account,
        );
        income.category_id = Some(salary);
        create(&store, income);

        let expenses = list(
            &store,
            &TransactionQueryInput {
                kind: Some(TransactionKind::Expense),
                ..TransactionQueryInput::default()
            },
        )
        .unwrap();
        assert_eq!(expenses.len(), 1);
        assert_eq!(expenses[0].note.as_deref(), Some("Lunch with Alex"));

        let search = list(
            &store,
            &TransactionQueryInput {
                search_text: "alex".to_string(),
                ..TransactionQueryInput::default()
            },
        )
        .unwrap();
        assert_eq!(search.len(), 1);

        let day = list(
            &store,
            &TransactionQueryInput {
                start_day: Some("2026-11-28".to_string()),
                end_day: Some("2026-11-28".to_string()),
                ..TransactionQueryInput::default()
            },
        )
        .unwrap();
        assert_eq!(day.len(), 1);
        assert_eq!(day[0].kind, TransactionKind::Income);

        let by_account = list(
            &store,
            &TransactionQueryInput {
                account_id: Some(account),
                ..TransactionQueryInput::default()
            },
        )
        .unwrap();
        assert_eq!(by_account.len(), 2);
    }

    #[test]
    fn invalid_values_are_reported() {
        let store = store();
        let account = cash(&store);

        assert_eq!(
            create_transaction(
                &store,
                CreateTransactionInput {
                    draft: draft(
                        TransactionKind::Expense,
                        "abc",
                        "2026-11-27T09:30",
                        &account
                    )
                }
            )
            .unwrap_err(),
            TransactionError::InvalidAmount
        );
        assert_eq!(
            create_transaction(
                &store,
                CreateTransactionInput {
                    draft: draft(TransactionKind::Expense, "0", "2026-11-27T09:30", &account)
                }
            )
            .unwrap_err(),
            TransactionError::AmountNotPositive
        );
        let mut bad_date = draft(TransactionKind::Expense, "1.00", "not-a-date", &account);
        bad_date.category_id = Some(category(&store, "Food"));
        assert_eq!(
            create_transaction(&store, CreateTransactionInput { draft: bad_date }).unwrap_err(),
            TransactionError::InvalidDateTime
        );
        let mut missing_category = draft(
            TransactionKind::Expense,
            "1.00",
            "2026-11-27T09:30",
            &account,
        );
        missing_category.category_id = None;
        assert_eq!(
            create_transaction(
                &store,
                CreateTransactionInput {
                    draft: missing_category
                }
            )
            .unwrap_err(),
            TransactionError::CategoryRequired
        );
        assert_eq!(
            list(
                &store,
                &TransactionQueryInput {
                    start_day: Some("2026-11-28".to_string()),
                    end_day: Some("2026-11-27".to_string()),
                    ..TransactionQueryInput::default()
                }
            )
            .unwrap_err(),
            TransactionError::InvalidDateRange
        );
        let unknown = AccountId::from_uuid(uuid::Uuid::from_u128(9_999));
        assert_eq!(
            list(
                &store,
                &TransactionQueryInput {
                    account_id: Some(unknown.to_string()),
                    ..TransactionQueryInput::default()
                }
            )
            .unwrap_err(),
            TransactionError::FilterReferenceUnavailable
        );
        let mut bad_reference = draft(
            TransactionKind::Expense,
            "1.00",
            "2026-11-27T09:30",
            &account,
        );
        bad_reference.category_id = Some("not-a-uuid".to_string());
        assert_eq!(
            create_transaction(
                &store,
                CreateTransactionInput {
                    draft: bad_reference
                }
            )
            .unwrap_err(),
            TransactionError::InvalidReference
        );
    }

    #[test]
    fn archived_references_are_rejected() {
        let store = store();
        let account = cash(&store);
        let food = category(&store, "Food");
        master_data::update_category(
            &store,
            master_data::UpdateCategoryInput {
                id: food.clone(),
                name: "Food".to_string(),
                group_id: None,
                is_archived: true,
            },
        )
        .unwrap();
        let mut input = draft(
            TransactionKind::Expense,
            "1.00",
            "2026-11-27T09:30",
            &account,
        );
        input.category_id = Some(food);

        assert_eq!(
            create_transaction(&store, CreateTransactionInput { draft: input }).unwrap_err(),
            TransactionError::CategoryUnavailable
        );
    }

    #[test]
    fn missing_and_uninitialized_transactions_are_reported() {
        let store = store();
        let missing = TransactionId::from_uuid(uuid::Uuid::from_u128(9_999));
        assert_eq!(
            get(&store, &missing.to_string()).unwrap_err(),
            TransactionError::NotFound
        );
        assert_eq!(
            set_deleted(&store, &missing.to_string(), true).unwrap_err(),
            TransactionError::NotFound
        );

        let uninitialized = SqliteLedger::open_in_memory(&"44".repeat(32)).unwrap();
        assert_eq!(
            list(&uninitialized, &TransactionQueryInput::default()).unwrap_err(),
            TransactionError::NotInitialized
        );
        assert_eq!(
            create_transaction(
                &uninitialized,
                CreateTransactionInput {
                    draft: draft(
                        TransactionKind::Expense,
                        "1.00",
                        "2026-11-27T09:30",
                        "not-a-uuid"
                    )
                }
            )
            .unwrap_err(),
            TransactionError::NotInitialized
        );
    }
}
