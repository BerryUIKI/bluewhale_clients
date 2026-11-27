//! Master-data operations for the open ledger: accounts and account groups,
//! two-level categories, tags, and counterparties.
//!
//! Every mutation composes the approved core use case; reads use the core
//! repository traits. Manual order is assigned here by appending to the end,
//! so the interface never edits positions. Archived records stay in the list
//! with their flag set so the interface can offer a restore.

use core_application::{
    ApplicationError, CreateAccountGroupRequest, CreateAccountGroupUseCase, CreateAccountRequest,
    CreateAccountWithOpeningBalanceUseCase, CreateCategoryGroupRequest, CreateCategoryGroupUseCase,
    CreateCategoryRequest, CreateCategoryUseCase, CreateCounterpartyRequest,
    CreateCounterpartyUseCase, CreateTagRequest, CreateTagUseCase, UpdateAccountGroupRequest,
    UpdateAccountGroupUseCase, UpdateAccountRequest, UpdateAccountUseCase,
    UpdateCategoryGroupRequest, UpdateCategoryGroupUseCase, UpdateCategoryRequest,
    UpdateCategoryUseCase, UpdateCounterpartyRequest, UpdateCounterpartyUseCase, UpdateTagRequest,
    UpdateTagUseCase,
};
use core_domain::{
    Account, AccountGroup, AccountGroupId, AccountGroupRepository, AccountGroupValidationError,
    AccountId, AccountOptions, AccountRepository, AccountSetupRepository, AccountValidationError,
    AssetAccountType, Category, CategoryGroup, CategoryGroupId, CategoryGroupRepository,
    CategoryGroupValidationError, CategoryId, CategoryKind, CategoryRepository,
    CategoryValidationError, Counterparty, CounterpartyId, CounterpartyKind,
    CounterpartyRepository, CounterpartyValidationError, CurrencyScalePolicy,
    LedgerSettingsRepository, LedgerTag, TagId, TagRepository, TagValidationError,
};
use std::collections::BTreeSet;
use std::str::FromStr;

use crate::clock::{SystemClock, Uuidv7Source};
use crate::error::MasterDataError;

/// The repositories a master-data operation needs.
///
/// `SqliteLedger` implements every trait; tests can use any store that does.
pub trait MasterDataStore:
    AccountRepository
    + AccountGroupRepository
    + CategoryRepository
    + CategoryGroupRepository
    + TagRepository
    + CounterpartyRepository
    + AccountSetupRepository
    + LedgerSettingsRepository
{
}

impl<T> MasterDataStore for T where
    T: AccountRepository
        + AccountGroupRepository
        + CategoryRepository
        + CategoryGroupRepository
        + TagRepository
        + CounterpartyRepository
        + AccountSetupRepository
        + LedgerSettingsRepository
{
}

/// One account with its optional fields.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountEntry {
    /// The account identity.
    pub id: AccountId,
    /// The display name.
    pub name: String,
    /// The asset type.
    pub asset_type: AssetAccountType,
    /// The native currency code.
    pub currency_code: String,
    /// The tags attached to the account.
    pub tag_ids: Vec<TagId>,
    /// The counterparty that owns the account.
    pub owner_id: Option<CounterpartyId>,
    /// The custom group that contains the account.
    pub custom_group_id: Option<AccountGroupId>,
    /// The free-form note.
    pub note: String,
    /// Whether the account is hidden from the main list.
    pub is_hidden: bool,
    /// Whether the account contributes to net worth.
    pub is_included_in_net_worth: bool,
    /// Whether the account is archived.
    pub is_archived: bool,
}

/// One custom account group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountGroupEntry {
    /// The group identity.
    pub id: AccountGroupId,
    /// The display name.
    pub name: String,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// One category group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CategoryGroupEntry {
    /// The group identity.
    pub id: CategoryGroupId,
    /// The display name.
    pub name: String,
    /// The kind shared by the group's categories.
    pub kind: CategoryKind,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// One leaf category.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CategoryEntry {
    /// The category identity.
    pub id: CategoryId,
    /// The display name.
    pub name: String,
    /// The category kind.
    pub kind: CategoryKind,
    /// The optional containing group.
    pub group_id: Option<CategoryGroupId>,
    /// Whether the category is archived.
    pub is_archived: bool,
}

/// One tag.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TagEntry {
    /// The tag identity.
    pub id: TagId,
    /// The display name.
    pub name: String,
    /// The `#RRGGBB` color.
    pub color_hex: String,
    /// The optional description.
    pub description: Option<String>,
    /// Whether the tag is archived.
    pub is_archived: bool,
}

/// One counterparty.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CounterpartyEntry {
    /// The counterparty identity.
    pub id: CounterpartyId,
    /// The kind.
    pub kind: CounterpartyKind,
    /// The display name.
    pub name: String,
    /// Whether the counterparty is archived.
    pub is_archived: bool,
}

/// Every master-data record of the open ledger, archived records included.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct MasterData {
    /// Accounts in manual order.
    pub accounts: Vec<AccountEntry>,
    /// Custom account groups in manual order.
    pub account_groups: Vec<AccountGroupEntry>,
    /// Category groups in manual order.
    pub category_groups: Vec<CategoryGroupEntry>,
    /// Leaf categories in manual order.
    pub categories: Vec<CategoryEntry>,
    /// Tags in manual order.
    pub tags: Vec<TagEntry>,
    /// Counterparties in manual order.
    pub counterparties: Vec<CounterpartyEntry>,
}

/// The request to create an account.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAccountInput {
    /// The display name.
    pub name: String,
    /// The asset type.
    pub asset_type: AssetAccountType,
    /// The native currency code.
    pub currency_code: String,
    /// The optional opening balance amount text.
    pub opening_balance_text: Option<String>,
    /// The tag identities as strings.
    pub tag_ids: Vec<String>,
    /// The owning counterparty identity.
    pub owner_id: Option<String>,
    /// The containing account group identity.
    pub custom_group_id: Option<String>,
    /// The free-form note.
    pub note: String,
    /// Whether the account is hidden from the main list.
    pub is_hidden: bool,
    /// Whether the account contributes to net worth.
    pub is_included_in_net_worth: bool,
}

/// The request to update an account.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAccountInput {
    /// The account identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The asset type.
    pub asset_type: AssetAccountType,
    /// The tag identities as strings.
    pub tag_ids: Vec<String>,
    /// The owning counterparty identity.
    pub owner_id: Option<String>,
    /// The containing account group identity.
    pub custom_group_id: Option<String>,
    /// The free-form note.
    pub note: String,
    /// Whether the account is hidden from the main list.
    pub is_hidden: bool,
    /// Whether the account contributes to net worth.
    pub is_included_in_net_worth: bool,
    /// Whether the account is archived.
    pub is_archived: bool,
}

/// The request to create an account group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAccountGroupInput {
    /// The display name.
    pub name: String,
}

/// The request to update an account group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAccountGroupInput {
    /// The group identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// The request to create a category group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateCategoryGroupInput {
    /// The display name.
    pub name: String,
    /// The kind shared by the group's categories.
    pub kind: CategoryKind,
}

/// The request to update a category group.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateCategoryGroupInput {
    /// The group identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// The request to create a leaf category.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateCategoryInput {
    /// The display name.
    pub name: String,
    /// The category kind.
    pub kind: CategoryKind,
    /// The optional containing group.
    pub group_id: Option<String>,
}

/// The request to update a leaf category.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateCategoryInput {
    /// The category identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The optional containing group.
    pub group_id: Option<String>,
    /// Whether the category is archived.
    pub is_archived: bool,
}

/// The request to create a tag.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateTagInput {
    /// The display name.
    pub name: String,
    /// The `#RRGGBB` color.
    pub color_hex: String,
    /// The optional description.
    pub description: Option<String>,
}

/// The request to update a tag.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateTagInput {
    /// The tag identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The `#RRGGBB` color.
    pub color_hex: String,
    /// The optional description.
    pub description: Option<String>,
    /// Whether the tag is archived.
    pub is_archived: bool,
}

/// The request to create a counterparty.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateCounterpartyInput {
    /// The kind.
    pub kind: CounterpartyKind,
    /// The display name.
    pub name: String,
}

/// The request to update a counterparty.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateCounterpartyInput {
    /// The counterparty identity.
    pub id: String,
    /// The kind.
    pub kind: CounterpartyKind,
    /// The display name.
    pub name: String,
    /// Whether the counterparty is archived.
    pub is_archived: bool,
}

/// Loads every master-data record, archived records included.
///
/// # Errors
///
/// Returns [`MasterDataError::NotInitialized`] for a database without ledger
/// settings and [`MasterDataError::Internal`] when a read fails.
pub fn load(store: &impl MasterDataStore) -> Result<MasterData, MasterDataError> {
    ensure_initialized(store)?;
    Ok(MasterData {
        accounts: store.accounts(true)?.iter().map(account_entry).collect(),
        account_groups: store
            .account_groups(true)?
            .iter()
            .map(account_group_entry)
            .collect(),
        category_groups: store
            .category_groups(true)?
            .iter()
            .map(category_group_entry)
            .collect(),
        categories: store.categories(true)?.iter().map(category_entry).collect(),
        tags: store.tags(true)?.iter().map(tag_entry).collect(),
        counterparties: store
            .counterparties(true)?
            .iter()
            .map(counterparty_entry)
            .collect(),
    })
}

/// Creates an account and its optional opening balance.
///
/// # Errors
///
/// Returns a validation error for invalid input, or a store error when the
/// account cannot be saved.
pub fn create_account(
    store: &impl MasterDataStore,
    input: CreateAccountInput,
) -> Result<AccountEntry, MasterDataError> {
    ensure_initialized(store)?;
    let currency = CurrencyScalePolicy::v1()
        .currency(&input.currency_code)
        .map_err(|_| MasterDataError::InvalidCurrency)?;
    let sort_order = next_sort_order(
        store
            .accounts(true)?
            .iter()
            .map(|account| account.options().sort_order),
    );
    let options = AccountOptions {
        sort_order,
        is_archived: false,
        tag_ids: parse_id_set(&input.tag_ids)?,
        owner_id: parse_optional_id(input.owner_id.as_deref())?,
        custom_group_id: parse_optional_id(input.custom_group_id.as_deref())?,
        note: input.note,
        is_hidden: input.is_hidden,
        is_included_in_net_worth: input.is_included_in_net_worth,
    };
    let outcome =
        CreateAccountWithOpeningBalanceUseCase::new(store, store, &SystemClock, &Uuidv7Source)
            .execute(&CreateAccountRequest {
                name: input.name,
                asset_type: input.asset_type,
                currency,
                options,
                opening_balance_text: input.opening_balance_text,
            })
            .map_err(map_application_error)?;
    Ok(account_entry(&outcome.account))
}

/// Updates an account without changing its currency.
///
/// # Errors
///
/// Returns [`MasterDataError::NotFound`] for an unknown account, a validation
/// error for invalid input, or a store error when the account cannot be saved.
pub fn update_account(
    store: &impl MasterDataStore,
    input: UpdateAccountInput,
) -> Result<AccountEntry, MasterDataError> {
    ensure_initialized(store)?;
    let existing = store
        .account(parse_id::<AccountId>(&input.id)?)?
        .ok_or(MasterDataError::NotFound)?;
    let options = AccountOptions {
        sort_order: existing.options().sort_order,
        is_archived: input.is_archived,
        tag_ids: parse_id_set(&input.tag_ids)?,
        owner_id: parse_optional_id(input.owner_id.as_deref())?,
        custom_group_id: parse_optional_id(input.custom_group_id.as_deref())?,
        note: input.note,
        is_hidden: input.is_hidden,
        is_included_in_net_worth: input.is_included_in_net_worth,
    };
    let account = UpdateAccountUseCase::new(store, store, &SystemClock)
        .execute(&UpdateAccountRequest {
            id: existing.id(),
            name: input.name,
            asset_type: input.asset_type,
            options,
        })
        .map_err(map_application_error)?;
    Ok(account_entry(&account))
}

/// Creates an account group.
///
/// # Errors
///
/// Returns a validation error for an empty name or a store error.
pub fn create_account_group(
    store: &impl MasterDataStore,
    input: CreateAccountGroupInput,
) -> Result<AccountGroupEntry, MasterDataError> {
    ensure_initialized(store)?;
    let sort_order = next_sort_order(
        store
            .account_groups(true)?
            .iter()
            .map(AccountGroup::sort_order),
    );
    let group = CreateAccountGroupUseCase::new(store, &SystemClock, &Uuidv7Source)
        .execute(&CreateAccountGroupRequest {
            name: input.name,
            sort_order,
        })
        .map_err(map_application_error)?;
    Ok(account_group_entry(&group))
}

/// Updates an account group.
///
/// # Errors
///
/// Returns [`MasterDataError::NotFound`] for an unknown group, a validation
/// error for an invalid name, or a store error.
pub fn update_account_group(
    store: &impl MasterDataStore,
    input: UpdateAccountGroupInput,
) -> Result<AccountGroupEntry, MasterDataError> {
    ensure_initialized(store)?;
    let existing = store
        .account_group(parse_id::<AccountGroupId>(&input.id)?)?
        .ok_or(MasterDataError::NotFound)?;
    let group = UpdateAccountGroupUseCase::new(store, &SystemClock)
        .execute(&UpdateAccountGroupRequest {
            id: existing.id(),
            name: input.name,
            sort_order: existing.sort_order(),
            is_archived: input.is_archived,
        })
        .map_err(map_application_error)?;
    Ok(account_group_entry(&group))
}

/// Creates a category group.
///
/// # Errors
///
/// Returns a validation error for an empty name or a store error.
pub fn create_category_group(
    store: &impl MasterDataStore,
    input: CreateCategoryGroupInput,
) -> Result<CategoryGroupEntry, MasterDataError> {
    ensure_initialized(store)?;
    let sort_order = next_sort_order(
        store
            .category_groups(true)?
            .iter()
            .filter(|group| group.kind() == input.kind)
            .map(CategoryGroup::sort_order),
    );
    let group = CreateCategoryGroupUseCase::new(store, &SystemClock, &Uuidv7Source)
        .execute(&CreateCategoryGroupRequest {
            name: input.name,
            kind: input.kind,
            sort_order,
        })
        .map_err(map_application_error)?;
    Ok(category_group_entry(&group))
}

/// Updates a category group. Its kind never changes.
///
/// # Errors
///
/// Returns [`MasterDataError::NotFound`] for an unknown group, a validation
/// error for an invalid name, or a store error.
pub fn update_category_group(
    store: &impl MasterDataStore,
    input: UpdateCategoryGroupInput,
) -> Result<CategoryGroupEntry, MasterDataError> {
    ensure_initialized(store)?;
    let existing = store
        .category_group(parse_id::<CategoryGroupId>(&input.id)?)?
        .ok_or(MasterDataError::NotFound)?;
    let group = UpdateCategoryGroupUseCase::new(store, &SystemClock)
        .execute(&UpdateCategoryGroupRequest {
            id: existing.id(),
            name: input.name,
            sort_order: existing.sort_order(),
            is_archived: input.is_archived,
        })
        .map_err(map_application_error)?;
    Ok(category_group_entry(&group))
}

/// Creates a leaf category.
///
/// # Errors
///
/// Returns [`MasterDataError::NotFound`] or [`MasterDataError::ArchivedGroup`]
/// for an unusable group, [`MasterDataError::KindMismatch`] when the group's
/// kind differs, a validation error for an empty name, or a store error.
pub fn create_category(
    store: &impl MasterDataStore,
    input: CreateCategoryInput,
) -> Result<CategoryEntry, MasterDataError> {
    ensure_initialized(store)?;
    let sort_order = next_sort_order(
        store
            .categories(true)?
            .iter()
            .filter(|category| category.kind() == input.kind)
            .map(|category| category.options().sort_order),
    );
    let category = CreateCategoryUseCase::new(store, store, &SystemClock, &Uuidv7Source)
        .execute(&CreateCategoryRequest {
            name: input.name,
            kind: input.kind,
            group_id: parse_optional_id(input.group_id.as_deref())?,
            sort_order,
        })
        .map_err(map_application_error)?;
    Ok(category_entry(&category))
}

/// Updates a leaf category. Its kind never changes.
///
/// # Errors
///
/// Returns [`MasterDataError::NotFound`] for an unknown category or group,
/// [`MasterDataError::ArchivedGroup`] for an archived target group,
/// [`MasterDataError::KindMismatch`] for a group of another kind, a validation
/// error for an empty name, or a store error.
pub fn update_category(
    store: &impl MasterDataStore,
    input: UpdateCategoryInput,
) -> Result<CategoryEntry, MasterDataError> {
    ensure_initialized(store)?;
    let existing = store
        .category(parse_id::<CategoryId>(&input.id)?)?
        .ok_or(MasterDataError::NotFound)?;
    let category = UpdateCategoryUseCase::new(store, store, &SystemClock)
        .execute(&UpdateCategoryRequest {
            id: existing.id(),
            name: input.name,
            group_id: parse_optional_id(input.group_id.as_deref())?,
            sort_order: existing.options().sort_order,
            is_archived: input.is_archived,
        })
        .map_err(map_application_error)?;
    Ok(category_entry(&category))
}

/// Creates a tag.
///
/// # Errors
///
/// Returns a validation error for an empty name or malformed color, or a store
/// error.
pub fn create_tag(
    store: &impl MasterDataStore,
    input: CreateTagInput,
) -> Result<TagEntry, MasterDataError> {
    ensure_initialized(store)?;
    let sort_order = next_sort_order(store.tags(true)?.iter().map(|tag| tag.options().sort_order));
    let tag = CreateTagUseCase::new(store, &SystemClock, &Uuidv7Source)
        .execute(&CreateTagRequest {
            name: input.name,
            color_hex: input.color_hex,
            description: input.description,
            sort_order,
        })
        .map_err(map_application_error)?;
    Ok(tag_entry(&tag))
}

/// Updates a tag.
///
/// # Errors
///
/// Returns [`MasterDataError::NotFound`] for an unknown tag, a validation
/// error for an empty name or malformed color, or a store error.
pub fn update_tag(
    store: &impl MasterDataStore,
    input: UpdateTagInput,
) -> Result<TagEntry, MasterDataError> {
    ensure_initialized(store)?;
    let existing = store
        .tag(parse_id::<TagId>(&input.id)?)?
        .ok_or(MasterDataError::NotFound)?;
    let tag = UpdateTagUseCase::new(store, &SystemClock)
        .execute(&UpdateTagRequest {
            id: existing.id(),
            name: input.name,
            color_hex: input.color_hex,
            description: input.description,
            sort_order: existing.options().sort_order,
            is_archived: input.is_archived,
        })
        .map_err(map_application_error)?;
    Ok(tag_entry(&tag))
}

/// Creates a counterparty.
///
/// # Errors
///
/// Returns a validation error for an empty name or a store error.
pub fn create_counterparty(
    store: &impl MasterDataStore,
    input: CreateCounterpartyInput,
) -> Result<CounterpartyEntry, MasterDataError> {
    ensure_initialized(store)?;
    let sort_order = next_sort_order(
        store
            .counterparties(true)?
            .iter()
            .map(Counterparty::sort_order),
    );
    let counterparty = CreateCounterpartyUseCase::new(store, &SystemClock, &Uuidv7Source)
        .execute(&CreateCounterpartyRequest {
            kind: input.kind,
            name: input.name,
            sort_order,
        })
        .map_err(map_application_error)?;
    Ok(counterparty_entry(&counterparty))
}

/// Updates a counterparty.
///
/// # Errors
///
/// Returns [`MasterDataError::NotFound`] for an unknown counterparty, a
/// validation error for an empty name, or a store error.
pub fn update_counterparty(
    store: &impl MasterDataStore,
    input: UpdateCounterpartyInput,
) -> Result<CounterpartyEntry, MasterDataError> {
    ensure_initialized(store)?;
    let existing = store
        .counterparty(parse_id::<CounterpartyId>(&input.id)?)?
        .ok_or(MasterDataError::NotFound)?;
    let counterparty = UpdateCounterpartyUseCase::new(store, &SystemClock)
        .execute(&UpdateCounterpartyRequest {
            id: existing.id(),
            kind: input.kind,
            name: input.name,
            sort_order: existing.sort_order(),
            is_archived: input.is_archived,
        })
        .map_err(map_application_error)?;
    Ok(counterparty_entry(&counterparty))
}

fn ensure_initialized(store: &impl LedgerSettingsRepository) -> Result<(), MasterDataError> {
    if store.settings()?.is_none() {
        return Err(MasterDataError::NotInitialized);
    }
    Ok(())
}

fn next_sort_order(values: impl Iterator<Item = i32>) -> i32 {
    values.max().map_or(0, |value| value.saturating_add(1))
}

fn parse_id<T: FromStr>(value: &str) -> Result<T, MasterDataError> {
    value.parse().map_err(|_| MasterDataError::InvalidReference)
}

fn parse_optional_id<T: FromStr>(value: Option<&str>) -> Result<Option<T>, MasterDataError> {
    value
        .filter(|value| !value.is_empty())
        .map(parse_id)
        .transpose()
}

fn parse_id_set<T: FromStr + Ord>(values: &[String]) -> Result<BTreeSet<T>, MasterDataError> {
    values
        .iter()
        .map(|value| parse_id(value))
        .collect::<Result<BTreeSet<T>, MasterDataError>>()
}

fn account_entry(account: &Account) -> AccountEntry {
    AccountEntry {
        id: account.id(),
        name: account.name().to_string(),
        asset_type: account.asset_type(),
        currency_code: account.currency().code().to_string(),
        tag_ids: account.options().tag_ids.iter().copied().collect(),
        owner_id: account.options().owner_id,
        custom_group_id: account.options().custom_group_id,
        note: account.options().note.clone(),
        is_hidden: account.options().is_hidden,
        is_included_in_net_worth: account.options().is_included_in_net_worth,
        is_archived: account.is_archived(),
    }
}

fn account_group_entry(group: &AccountGroup) -> AccountGroupEntry {
    AccountGroupEntry {
        id: group.id(),
        name: group.name().to_string(),
        is_archived: group.is_archived(),
    }
}

fn category_group_entry(group: &CategoryGroup) -> CategoryGroupEntry {
    CategoryGroupEntry {
        id: group.id(),
        name: group.name().to_string(),
        kind: group.kind(),
        is_archived: group.is_archived(),
    }
}

fn category_entry(category: &Category) -> CategoryEntry {
    CategoryEntry {
        id: category.id(),
        name: category.name().to_string(),
        kind: category.kind(),
        group_id: category.options().group_id,
        is_archived: category.is_archived(),
    }
}

fn tag_entry(tag: &LedgerTag) -> TagEntry {
    TagEntry {
        id: tag.id(),
        name: tag.name().to_string(),
        color_hex: tag.color_hex().to_string(),
        description: tag.options().description.clone(),
        is_archived: tag.is_archived(),
    }
}

fn counterparty_entry(counterparty: &Counterparty) -> CounterpartyEntry {
    CounterpartyEntry {
        id: counterparty.id(),
        kind: counterparty.kind(),
        name: counterparty.name().to_string(),
        is_archived: counterparty.is_archived(),
    }
}

fn map_application_error(error: ApplicationError) -> MasterDataError {
    match error {
        ApplicationError::Account(AccountValidationError::EmptyName)
        | ApplicationError::AccountGroup(AccountGroupValidationError::EmptyName)
        | ApplicationError::Category(CategoryValidationError::EmptyName)
        | ApplicationError::CategoryGroup(CategoryGroupValidationError::EmptyName)
        | ApplicationError::Tag(TagValidationError::EmptyName)
        | ApplicationError::Counterparty(CounterpartyValidationError::EmptyName) => {
            MasterDataError::InvalidName
        }
        ApplicationError::Tag(TagValidationError::InvalidColorHex) => MasterDataError::InvalidColor,
        ApplicationError::Currency(_) => MasterDataError::InvalidCurrency,
        ApplicationError::Amount(_) => MasterDataError::InvalidAmount,
        ApplicationError::AccountNotFound(_)
        | ApplicationError::AccountGroupNotFound(_)
        | ApplicationError::CategoryNotFound(_)
        | ApplicationError::CategoryGroupNotFound(_)
        | ApplicationError::TagNotFound(_)
        | ApplicationError::CounterpartyNotFound(_) => MasterDataError::NotFound,
        ApplicationError::AccountGroupArchived(_) | ApplicationError::CategoryGroupArchived(_) => {
            MasterDataError::ArchivedGroup
        }
        ApplicationError::CategoryKindMismatch { .. } => MasterDataError::KindMismatch,
        ApplicationError::LedgerNotInitialized => MasterDataError::NotInitialized,
        _ => MasterDataError::Internal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use core_application::{
        DefaultLedgerContent, InitializeLedgerRequest, InitializeLedgerUseCase,
    };
    use core_domain::TransactionRepository;
    use core_persistence::SqliteLedger;

    fn store() -> SqliteLedger {
        let ledger = SqliteLedger::open_in_memory(&"11".repeat(32)).unwrap();
        let outcome = InitializeLedgerUseCase::new(
            &ledger,
            CurrencyScalePolicy::v1(),
            &SystemClock,
            &Uuidv7Source,
        )
        .execute(&InitializeLedgerRequest {
            ledger_name: "Household".to_string(),
            ledger_emoji: "🐳".to_string(),
            currency_code: "USD".to_string(),
            time_zone_identifier: "UTC".to_string(),
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

    fn tag(store: &impl MasterDataStore, name: &str) -> TagEntry {
        create_tag(
            store,
            CreateTagInput {
                name: name.to_string(),
                color_hex: "#112233".to_string(),
                description: None,
            },
        )
        .unwrap()
    }

    fn counterparty(store: &impl MasterDataStore, name: &str) -> CounterpartyEntry {
        create_counterparty(
            store,
            CreateCounterpartyInput {
                kind: CounterpartyKind::HouseholdMember,
                name: name.to_string(),
            },
        )
        .unwrap()
    }

    fn account_group(store: &impl MasterDataStore, name: &str) -> AccountGroupEntry {
        create_account_group(
            store,
            CreateAccountGroupInput {
                name: name.to_string(),
            },
        )
        .unwrap()
    }

    fn category_group(
        store: &impl MasterDataStore,
        name: &str,
        kind: CategoryKind,
    ) -> CategoryGroupEntry {
        create_category_group(
            store,
            CreateCategoryGroupInput {
                name: name.to_string(),
                kind,
            },
        )
        .unwrap()
    }

    fn category(
        store: &impl MasterDataStore,
        name: &str,
        kind: CategoryKind,
        group_id: Option<CategoryGroupId>,
    ) -> CategoryEntry {
        create_category(
            store,
            CreateCategoryInput {
                name: name.to_string(),
                kind,
                group_id: group_id.map(|id| id.to_string()),
            },
        )
        .unwrap()
    }

    fn account(store: &impl MasterDataStore, name: &str) -> AccountEntry {
        create_account(
            store,
            CreateAccountInput {
                name: name.to_string(),
                asset_type: AssetAccountType::Checking,
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
        .unwrap()
    }

    #[test]
    fn a_new_ledger_lists_its_default_master_data() {
        let store = store();

        let data = load(&store).unwrap();

        assert_eq!(data.accounts.len(), 1);
        assert_eq!(data.accounts[0].name, "Cash");
        assert_eq!(data.accounts[0].currency_code, "USD");
        assert_eq!(data.accounts[0].asset_type, AssetAccountType::Cash);
        assert_eq!(data.categories.len(), 3);
        assert_eq!(
            data.categories
                .iter()
                .filter(|category| category.kind == CategoryKind::Expense)
                .count(),
            2
        );
        assert!(data.category_groups.is_empty());
        assert!(data.account_groups.is_empty());
        assert!(data.tags.is_empty());
        assert!(data.counterparties.is_empty());
    }

    #[test]
    fn accounts_carry_membership_fields_and_can_be_archived() {
        let store = store();
        let travel = tag(&store, "Travel");
        let alex = counterparty(&store, "Alex");
        let bank = account_group(&store, "Bank");
        let first = create_account(
            &store,
            CreateAccountInput {
                name: "  Checking  ".to_string(),
                asset_type: AssetAccountType::Checking,
                currency_code: "USD".to_string(),
                opening_balance_text: Some("250.00".to_string()),
                tag_ids: vec![travel.id.to_string()],
                owner_id: Some(alex.id.to_string()),
                custom_group_id: Some(bank.id.to_string()),
                note: "  Joint account  ".to_string(),
                is_hidden: false,
                is_included_in_net_worth: true,
            },
        )
        .unwrap();

        assert_eq!(first.name, "Checking");
        assert_eq!(first.note, "Joint account");
        assert_eq!(first.tag_ids, vec![travel.id]);
        assert_eq!(first.owner_id, Some(alex.id));
        assert_eq!(first.custom_group_id, Some(bank.id));
        assert_eq!(store.transactions(true).unwrap().len(), 1);

        let second = account(&store, "Savings");
        let updated = update_account(
            &store,
            UpdateAccountInput {
                id: first.id.to_string(),
                name: "Main checking".to_string(),
                asset_type: AssetAccountType::Checking,
                tag_ids: vec![travel.id.to_string()],
                owner_id: Some(alex.id.to_string()),
                custom_group_id: Some(bank.id.to_string()),
                note: String::new(),
                is_hidden: false,
                is_included_in_net_worth: true,
                is_archived: true,
            },
        )
        .unwrap();

        assert!(updated.is_archived);
        assert_eq!(updated.name, "Main checking");
        assert_eq!(second.name, "Savings");
        let data = load(&store).unwrap();
        assert_eq!(data.accounts.len(), 3);
        assert!(data.accounts.iter().any(|account| account.is_archived));
        assert_eq!(data.accounts.last().unwrap().name, "Savings");
    }

    #[test]
    fn an_account_cannot_join_an_archived_group() {
        let store = store();
        let bank = account_group(&store, "Bank");
        let account = account(&store, "Checking");
        update_account_group(
            &store,
            UpdateAccountGroupInput {
                id: bank.id.to_string(),
                name: "Bank".to_string(),
                is_archived: true,
            },
        )
        .unwrap();

        assert_eq!(
            update_account(
                &store,
                UpdateAccountInput {
                    id: account.id.to_string(),
                    name: "Checking".to_string(),
                    asset_type: AssetAccountType::Checking,
                    tag_ids: Vec::new(),
                    owner_id: None,
                    custom_group_id: Some(bank.id.to_string()),
                    note: String::new(),
                    is_hidden: false,
                    is_included_in_net_worth: true,
                    is_archived: false,
                },
            )
            .unwrap_err(),
            MasterDataError::ArchivedGroup
        );
    }

    #[test]
    fn category_groups_and_categories_form_a_two_level_tree() {
        let store = store();
        let essentials = category_group(&store, "Essentials", CategoryKind::Expense);
        let groceries = category(
            &store,
            "Groceries",
            CategoryKind::Expense,
            Some(essentials.id),
        );

        assert_eq!(groceries.group_id, Some(essentials.id));
        assert_eq!(
            create_category(
                &store,
                CreateCategoryInput {
                    name: "Salary".to_string(),
                    kind: CategoryKind::Income,
                    group_id: Some(essentials.id.to_string()),
                },
            )
            .unwrap_err(),
            MasterDataError::KindMismatch
        );

        let ungrouped = update_category(
            &store,
            UpdateCategoryInput {
                id: groceries.id.to_string(),
                name: "Groceries".to_string(),
                group_id: None,
                is_archived: false,
            },
        )
        .unwrap();
        assert_eq!(ungrouped.group_id, None);

        update_category_group(
            &store,
            UpdateCategoryGroupInput {
                id: essentials.id.to_string(),
                name: "Essentials".to_string(),
                is_archived: true,
            },
        )
        .unwrap();
        assert_eq!(
            create_category(
                &store,
                CreateCategoryInput {
                    name: "Rent".to_string(),
                    kind: CategoryKind::Expense,
                    group_id: Some(essentials.id.to_string()),
                },
            )
            .unwrap_err(),
            MasterDataError::ArchivedGroup
        );
    }

    #[test]
    fn tags_normalize_colors_and_reject_invalid_values() {
        let store = store();
        let travel = create_tag(
            &store,
            CreateTagInput {
                name: "  Travel ".to_string(),
                color_hex: "#abc123".to_string(),
                description: Some("  Trips  ".to_string()),
            },
        )
        .unwrap();
        assert_eq!(travel.name, "Travel");
        assert_eq!(travel.color_hex, "#ABC123");
        assert_eq!(travel.description.as_deref(), Some("Trips"));

        let updated = update_tag(
            &store,
            UpdateTagInput {
                id: travel.id.to_string(),
                name: "Trips".to_string(),
                color_hex: "#445566".to_string(),
                description: None,
                is_archived: true,
            },
        )
        .unwrap();
        assert!(updated.is_archived);
        assert_eq!(updated.color_hex, "#445566");

        assert_eq!(
            create_tag(
                &store,
                CreateTagInput {
                    name: "Bad".to_string(),
                    color_hex: "red".to_string(),
                    description: None,
                },
            )
            .unwrap_err(),
            MasterDataError::InvalidColor
        );
        assert_eq!(
            create_tag(
                &store,
                CreateTagInput {
                    name: " ".to_string(),
                    color_hex: "#112233".to_string(),
                    description: None,
                },
            )
            .unwrap_err(),
            MasterDataError::InvalidName
        );
    }

    #[test]
    fn counterparties_create_update_and_archive() {
        let store = store();
        let alex = counterparty(&store, "Alex");

        let updated = update_counterparty(
            &store,
            UpdateCounterpartyInput {
                id: alex.id.to_string(),
                kind: CounterpartyKind::Person,
                name: "Alex Chen".to_string(),
                is_archived: true,
            },
        )
        .unwrap();

        assert_eq!(updated.kind, CounterpartyKind::Person);
        assert_eq!(updated.name, "Alex Chen");
        assert!(updated.is_archived);
        assert_eq!(load(&store).unwrap().counterparties, vec![updated]);
    }

    #[test]
    fn account_groups_create_update_and_archive() {
        let store = store();
        let bank = account_group(&store, "Bank");

        let updated = update_account_group(
            &store,
            UpdateAccountGroupInput {
                id: bank.id.to_string(),
                name: "Bank accounts".to_string(),
                is_archived: true,
            },
        )
        .unwrap();

        assert!(updated.is_archived);
        assert_eq!(updated.name, "Bank accounts");
    }

    #[test]
    fn unknown_identifiers_are_rejected() {
        let store = store();

        assert_eq!(
            create_account(
                &store,
                CreateAccountInput {
                    name: "Checking".to_string(),
                    asset_type: AssetAccountType::Checking,
                    currency_code: "USD".to_string(),
                    opening_balance_text: None,
                    tag_ids: Vec::new(),
                    owner_id: Some("not-a-uuid".to_string()),
                    custom_group_id: None,
                    note: String::new(),
                    is_hidden: false,
                    is_included_in_net_worth: true,
                },
            )
            .unwrap_err(),
            MasterDataError::InvalidReference
        );
        assert_eq!(
            update_tag(
                &store,
                UpdateTagInput {
                    id: "not-a-uuid".to_string(),
                    name: "Travel".to_string(),
                    color_hex: "#112233".to_string(),
                    description: None,
                    is_archived: false,
                },
            )
            .unwrap_err(),
            MasterDataError::InvalidReference
        );
    }

    #[test]
    fn missing_records_are_reported() {
        let store = store();
        let missing = AccountId::from_uuid(uuid::Uuid::from_u128(9_999));

        assert_eq!(
            update_account(
                &store,
                UpdateAccountInput {
                    id: missing.to_string(),
                    name: "Missing".to_string(),
                    asset_type: AssetAccountType::Cash,
                    tag_ids: Vec::new(),
                    owner_id: None,
                    custom_group_id: None,
                    note: String::new(),
                    is_hidden: false,
                    is_included_in_net_worth: true,
                    is_archived: false,
                },
            )
            .unwrap_err(),
            MasterDataError::NotFound
        );
    }

    #[test]
    fn invalid_amounts_are_reported() {
        let store = store();

        assert_eq!(
            create_account(
                &store,
                CreateAccountInput {
                    name: "Checking".to_string(),
                    asset_type: AssetAccountType::Checking,
                    currency_code: "USD".to_string(),
                    opening_balance_text: Some("not money".to_string()),
                    tag_ids: Vec::new(),
                    owner_id: None,
                    custom_group_id: None,
                    note: String::new(),
                    is_hidden: false,
                    is_included_in_net_worth: true,
                },
            )
            .unwrap_err(),
            MasterDataError::InvalidAmount
        );
        assert_eq!(
            create_account(
                &store,
                CreateAccountInput {
                    name: "Checking".to_string(),
                    asset_type: AssetAccountType::Checking,
                    currency_code: "ZZZ".to_string(),
                    opening_balance_text: None,
                    tag_ids: Vec::new(),
                    owner_id: None,
                    custom_group_id: None,
                    note: String::new(),
                    is_hidden: false,
                    is_included_in_net_worth: true,
                },
            )
            .unwrap_err(),
            MasterDataError::InvalidCurrency
        );
    }

    #[test]
    fn an_uninitialized_store_is_reported() {
        let store = SqliteLedger::open_in_memory(&"22".repeat(32)).unwrap();

        assert_eq!(load(&store).unwrap_err(), MasterDataError::NotInitialized);
        assert_eq!(
            create_tag(
                &store,
                CreateTagInput {
                    name: "Travel".to_string(),
                    color_hex: "#112233".to_string(),
                    description: None,
                },
            )
            .unwrap_err(),
            MasterDataError::NotInitialized
        );
    }
}
