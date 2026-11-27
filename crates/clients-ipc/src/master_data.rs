//! Master-data commands and presentation DTOs.
//!
//! DTOs mirror the runtime entries and requests; identifiers cross the
//! boundary as strings. Errors keep a stable code and a message key that the
//! interface localizes.

use clients_runtime::{
    AccountEntry, AccountGroupEntry, CategoryEntry, CategoryGroupEntry, CounterpartyEntry,
    CreateAccountGroupInput, CreateAccountInput, CreateCategoryGroupInput, CreateCategoryInput,
    CreateCounterpartyInput, CreateTagInput, MasterData, MasterDataError, TagEntry,
    UpdateAccountGroupInput, UpdateAccountInput, UpdateCategoryGroupInput, UpdateCategoryInput,
    UpdateCounterpartyInput, UpdateTagInput,
};
use core_domain::{AssetAccountType, CategoryKind, CounterpartyKind};
use serde::{Deserialize, Serialize};

use crate::{CommandError, ErrorCode};

/// Every master-data record of the open ledger.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MasterDataDto {
    /// Accounts in manual order.
    pub accounts: Vec<AccountDto>,
    /// Custom account groups in manual order.
    pub account_groups: Vec<AccountGroupDto>,
    /// Category groups in manual order.
    pub category_groups: Vec<CategoryGroupDto>,
    /// Leaf categories in manual order.
    pub categories: Vec<CategoryDto>,
    /// Tags in manual order.
    pub tags: Vec<TagDto>,
    /// Counterparties in manual order.
    pub counterparties: Vec<CounterpartyDto>,
}

/// The kind of asset account.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum AssetTypeDto {
    /// Physical cash.
    Cash,
    /// A checking or current account.
    Checking,
    /// A savings account.
    Savings,
    /// Stored value such as a transit or gift card.
    StoredValue,
}

/// Whether a category classifies spending or income.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum CategoryKindDto {
    /// Spending categories.
    Expense,
    /// Income categories.
    Income,
}

/// The kind of counterparty.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum CounterpartyKindDto {
    /// A member of the household.
    HouseholdMember,
    /// A person outside the household.
    Person,
    /// An organization.
    Organization,
}

/// One account.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountDto {
    /// The account identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The asset type.
    pub asset_type: AssetTypeDto,
    /// The native currency code.
    pub currency_code: String,
    /// The tags attached to the account.
    pub tag_ids: Vec<String>,
    /// The counterparty that owns the account.
    pub owner_id: Option<String>,
    /// The custom group that contains the account.
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

/// One custom account group.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountGroupDto {
    /// The group identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// One category group.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryGroupDto {
    /// The group identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The kind shared by the group's categories.
    pub kind: CategoryKindDto,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// One leaf category.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryDto {
    /// The category identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The category kind.
    pub kind: CategoryKindDto,
    /// The optional containing group.
    pub group_id: Option<String>,
    /// Whether the category is archived.
    pub is_archived: bool,
}

/// One tag.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TagDto {
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

/// One counterparty.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CounterpartyDto {
    /// The counterparty identity.
    pub id: String,
    /// The kind.
    pub kind: CounterpartyKindDto,
    /// The display name.
    pub name: String,
    /// Whether the counterparty is archived.
    pub is_archived: bool,
}

/// A request to create an account.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountCreateRequestDto {
    /// The display name.
    pub name: String,
    /// The asset type.
    pub asset_type: AssetTypeDto,
    /// The native currency code.
    pub currency_code: String,
    /// The optional opening balance amount text.
    pub opening_balance_text: Option<String>,
    /// The tag identities.
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

/// A request to update an account.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountUpdateRequestDto {
    /// The account identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The asset type.
    pub asset_type: AssetTypeDto,
    /// The tag identities.
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

/// A request to create an account group.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountGroupCreateRequestDto {
    /// The display name.
    pub name: String,
}

/// A request to update an account group.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountGroupUpdateRequestDto {
    /// The group identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// A request to create a category group.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryGroupCreateRequestDto {
    /// The display name.
    pub name: String,
    /// The kind shared by the group's categories.
    pub kind: CategoryKindDto,
}

/// A request to update a category group.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryGroupUpdateRequestDto {
    /// The group identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// Whether the group is archived.
    pub is_archived: bool,
}

/// A request to create a leaf category.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryCreateRequestDto {
    /// The display name.
    pub name: String,
    /// The category kind.
    pub kind: CategoryKindDto,
    /// The optional containing group.
    pub group_id: Option<String>,
}

/// A request to update a leaf category.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryUpdateRequestDto {
    /// The category identity.
    pub id: String,
    /// The display name.
    pub name: String,
    /// The optional containing group.
    pub group_id: Option<String>,
    /// Whether the category is archived.
    pub is_archived: bool,
}

/// A request to create a tag.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TagCreateRequestDto {
    /// The display name.
    pub name: String,
    /// The `#RRGGBB` color.
    pub color_hex: String,
    /// The optional description.
    pub description: Option<String>,
}

/// A request to update a tag.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct TagUpdateRequestDto {
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

/// A request to create a counterparty.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CounterpartyCreateRequestDto {
    /// The kind.
    pub kind: CounterpartyKindDto,
    /// The display name.
    pub name: String,
}

/// A request to update a counterparty.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CounterpartyUpdateRequestDto {
    /// The counterparty identity.
    pub id: String,
    /// The kind.
    pub kind: CounterpartyKindDto,
    /// The display name.
    pub name: String,
    /// Whether the counterparty is archived.
    pub is_archived: bool,
}

impl From<MasterData> for MasterDataDto {
    fn from(data: MasterData) -> Self {
        Self {
            accounts: data.accounts.into_iter().map(Into::into).collect(),
            account_groups: data.account_groups.into_iter().map(Into::into).collect(),
            category_groups: data.category_groups.into_iter().map(Into::into).collect(),
            categories: data.categories.into_iter().map(Into::into).collect(),
            tags: data.tags.into_iter().map(Into::into).collect(),
            counterparties: data.counterparties.into_iter().map(Into::into).collect(),
        }
    }
}

impl From<AccountEntry> for AccountDto {
    fn from(entry: AccountEntry) -> Self {
        Self {
            id: entry.id.to_string(),
            name: entry.name,
            asset_type: entry.asset_type.into(),
            currency_code: entry.currency_code,
            tag_ids: entry.tag_ids.iter().map(ToString::to_string).collect(),
            owner_id: entry.owner_id.map(|id| id.to_string()),
            custom_group_id: entry.custom_group_id.map(|id| id.to_string()),
            note: entry.note,
            is_hidden: entry.is_hidden,
            is_included_in_net_worth: entry.is_included_in_net_worth,
            is_archived: entry.is_archived,
        }
    }
}

impl From<AccountGroupEntry> for AccountGroupDto {
    fn from(entry: AccountGroupEntry) -> Self {
        Self {
            id: entry.id.to_string(),
            name: entry.name,
            is_archived: entry.is_archived,
        }
    }
}

impl From<CategoryGroupEntry> for CategoryGroupDto {
    fn from(entry: CategoryGroupEntry) -> Self {
        Self {
            id: entry.id.to_string(),
            name: entry.name,
            kind: entry.kind.into(),
            is_archived: entry.is_archived,
        }
    }
}

impl From<CategoryEntry> for CategoryDto {
    fn from(entry: CategoryEntry) -> Self {
        Self {
            id: entry.id.to_string(),
            name: entry.name,
            kind: entry.kind.into(),
            group_id: entry.group_id.map(|id| id.to_string()),
            is_archived: entry.is_archived,
        }
    }
}

impl From<TagEntry> for TagDto {
    fn from(entry: TagEntry) -> Self {
        Self {
            id: entry.id.to_string(),
            name: entry.name,
            color_hex: entry.color_hex,
            description: entry.description,
            is_archived: entry.is_archived,
        }
    }
}

impl From<CounterpartyEntry> for CounterpartyDto {
    fn from(entry: CounterpartyEntry) -> Self {
        Self {
            id: entry.id.to_string(),
            kind: entry.kind.into(),
            name: entry.name,
            is_archived: entry.is_archived,
        }
    }
}

impl From<AssetAccountType> for AssetTypeDto {
    fn from(value: AssetAccountType) -> Self {
        match value {
            AssetAccountType::Cash => Self::Cash,
            AssetAccountType::Checking => Self::Checking,
            AssetAccountType::Savings => Self::Savings,
            AssetAccountType::StoredValue => Self::StoredValue,
        }
    }
}

impl From<AssetTypeDto> for AssetAccountType {
    fn from(value: AssetTypeDto) -> Self {
        match value {
            AssetTypeDto::Cash => Self::Cash,
            AssetTypeDto::Checking => Self::Checking,
            AssetTypeDto::Savings => Self::Savings,
            AssetTypeDto::StoredValue => Self::StoredValue,
        }
    }
}

impl From<CategoryKind> for CategoryKindDto {
    fn from(value: CategoryKind) -> Self {
        match value {
            CategoryKind::Expense => Self::Expense,
            CategoryKind::Income => Self::Income,
        }
    }
}

impl From<CategoryKindDto> for CategoryKind {
    fn from(value: CategoryKindDto) -> Self {
        match value {
            CategoryKindDto::Expense => Self::Expense,
            CategoryKindDto::Income => Self::Income,
        }
    }
}

impl From<CounterpartyKind> for CounterpartyKindDto {
    fn from(value: CounterpartyKind) -> Self {
        match value {
            CounterpartyKind::HouseholdMember => Self::HouseholdMember,
            CounterpartyKind::Person => Self::Person,
            CounterpartyKind::Organization => Self::Organization,
        }
    }
}

impl From<CounterpartyKindDto> for CounterpartyKind {
    fn from(value: CounterpartyKindDto) -> Self {
        match value {
            CounterpartyKindDto::HouseholdMember => Self::HouseholdMember,
            CounterpartyKindDto::Person => Self::Person,
            CounterpartyKindDto::Organization => Self::Organization,
        }
    }
}

impl From<AccountCreateRequestDto> for CreateAccountInput {
    fn from(request: AccountCreateRequestDto) -> Self {
        Self {
            name: request.name,
            asset_type: request.asset_type.into(),
            currency_code: request.currency_code,
            opening_balance_text: request.opening_balance_text,
            tag_ids: request.tag_ids,
            owner_id: request.owner_id,
            custom_group_id: request.custom_group_id,
            note: request.note,
            is_hidden: request.is_hidden,
            is_included_in_net_worth: request.is_included_in_net_worth,
        }
    }
}

impl From<AccountUpdateRequestDto> for UpdateAccountInput {
    fn from(request: AccountUpdateRequestDto) -> Self {
        Self {
            id: request.id,
            name: request.name,
            asset_type: request.asset_type.into(),
            tag_ids: request.tag_ids,
            owner_id: request.owner_id,
            custom_group_id: request.custom_group_id,
            note: request.note,
            is_hidden: request.is_hidden,
            is_included_in_net_worth: request.is_included_in_net_worth,
            is_archived: request.is_archived,
        }
    }
}

impl From<AccountGroupCreateRequestDto> for CreateAccountGroupInput {
    fn from(request: AccountGroupCreateRequestDto) -> Self {
        Self { name: request.name }
    }
}

impl From<AccountGroupUpdateRequestDto> for UpdateAccountGroupInput {
    fn from(request: AccountGroupUpdateRequestDto) -> Self {
        Self {
            id: request.id,
            name: request.name,
            is_archived: request.is_archived,
        }
    }
}

impl From<CategoryGroupCreateRequestDto> for CreateCategoryGroupInput {
    fn from(request: CategoryGroupCreateRequestDto) -> Self {
        Self {
            name: request.name,
            kind: request.kind.into(),
        }
    }
}

impl From<CategoryGroupUpdateRequestDto> for UpdateCategoryGroupInput {
    fn from(request: CategoryGroupUpdateRequestDto) -> Self {
        Self {
            id: request.id,
            name: request.name,
            is_archived: request.is_archived,
        }
    }
}

impl From<CategoryCreateRequestDto> for CreateCategoryInput {
    fn from(request: CategoryCreateRequestDto) -> Self {
        Self {
            name: request.name,
            kind: request.kind.into(),
            group_id: request.group_id,
        }
    }
}

impl From<CategoryUpdateRequestDto> for UpdateCategoryInput {
    fn from(request: CategoryUpdateRequestDto) -> Self {
        Self {
            id: request.id,
            name: request.name,
            group_id: request.group_id,
            is_archived: request.is_archived,
        }
    }
}

impl From<TagCreateRequestDto> for CreateTagInput {
    fn from(request: TagCreateRequestDto) -> Self {
        Self {
            name: request.name,
            color_hex: request.color_hex,
            description: request.description,
        }
    }
}

impl From<TagUpdateRequestDto> for UpdateTagInput {
    fn from(request: TagUpdateRequestDto) -> Self {
        Self {
            id: request.id,
            name: request.name,
            color_hex: request.color_hex,
            description: request.description,
            is_archived: request.is_archived,
        }
    }
}

impl From<CounterpartyCreateRequestDto> for CreateCounterpartyInput {
    fn from(request: CounterpartyCreateRequestDto) -> Self {
        Self {
            kind: request.kind.into(),
            name: request.name,
        }
    }
}

impl From<CounterpartyUpdateRequestDto> for UpdateCounterpartyInput {
    fn from(request: CounterpartyUpdateRequestDto) -> Self {
        Self {
            id: request.id,
            kind: request.kind.into(),
            name: request.name,
            is_archived: request.is_archived,
        }
    }
}

pub(crate) fn map_master_data_error(error: MasterDataError) -> CommandError {
    let code = match error {
        MasterDataError::NoActiveLedger | MasterDataError::NotInitialized => ErrorCode::Unavailable,
        MasterDataError::InvalidName
        | MasterDataError::InvalidColor
        | MasterDataError::InvalidCurrency
        | MasterDataError::InvalidReference
        | MasterDataError::InvalidAmount => ErrorCode::InvalidRequest,
        MasterDataError::NotFound => ErrorCode::NotFound,
        MasterDataError::ArchivedGroup | MasterDataError::KindMismatch => ErrorCode::Conflict,
        MasterDataError::Internal => ErrorCode::Internal,
    };
    CommandError::new(code, error.message_key())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn errors_map_to_stable_codes_and_keys() {
        assert_eq!(
            map_master_data_error(MasterDataError::NoActiveLedger).code,
            ErrorCode::Unavailable
        );
        assert_eq!(
            map_master_data_error(MasterDataError::InvalidColor).code,
            ErrorCode::InvalidRequest
        );
        assert_eq!(
            map_master_data_error(MasterDataError::InvalidReference).message_key,
            "errors.master_data_reference"
        );
        assert_eq!(
            map_master_data_error(MasterDataError::NotFound).code,
            ErrorCode::NotFound
        );
        assert_eq!(
            map_master_data_error(MasterDataError::ArchivedGroup).code,
            ErrorCode::Conflict
        );
        assert_eq!(
            map_master_data_error(MasterDataError::KindMismatch).message_key,
            "errors.master_data_kind_mismatch"
        );
        assert_eq!(
            map_master_data_error(MasterDataError::Internal).code,
            ErrorCode::Internal
        );
    }

    #[test]
    fn asset_types_round_trip() {
        for value in [
            AssetAccountType::Cash,
            AssetAccountType::Checking,
            AssetAccountType::Savings,
            AssetAccountType::StoredValue,
        ] {
            let dto = AssetTypeDto::from(value);
            assert_eq!(AssetAccountType::from(dto), value);
        }
    }

    #[test]
    fn category_and_counterparty_kinds_round_trip() {
        for value in [CategoryKind::Expense, CategoryKind::Income] {
            assert_eq!(CategoryKind::from(CategoryKindDto::from(value)), value);
        }
        for value in [
            CounterpartyKind::HouseholdMember,
            CounterpartyKind::Person,
            CounterpartyKind::Organization,
        ] {
            assert_eq!(
                CounterpartyKind::from(CounterpartyKindDto::from(value)),
                value
            );
        }
    }
}
