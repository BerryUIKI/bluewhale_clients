//! Dashboard and report commands and presentation DTOs.
//!
//! Converted totals are optional: when a rate is missing the runtime returns
//! native balances and the missing pair instead of a partial converted total.
//! Amounts cross the boundary as exact decimal strings.

use clients_runtime::DashboardError;
use clients_runtime::dashboard::{
    AccountBalanceEntry, CategoryRankingData, CategoryRankingEntry, DashboardData,
    DayCashFlowEntry, MissingRateEntry,
};
use core_domain::{CategoryKind, Money};
use serde::{Deserialize, Serialize};

use crate::transactions::{TransactionDto, money_text};
use crate::{CommandError, ErrorCode};

/// An exact money amount with its currency.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MoneyDto {
    /// The amount as an exact decimal string.
    pub text: String,
    /// The currency code.
    pub currency_code: String,
    /// The currency scale.
    pub scale: u8,
}

/// A missing conversion rate between two currencies.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MissingRateDto {
    /// The currency that needs conversion.
    pub source_currency: String,
    /// The reporting currency.
    pub reporting_currency: String,
}

/// The dashboard request for a ledger month.
#[derive(Debug, Clone, Default, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DashboardRequestDto {
    /// The ledger-local month, `YYYY-MM`; empty means the current month.
    #[serde(default)]
    pub month: String,
}

/// One account's balance in its native currency.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct AccountBalanceDto {
    /// The account identity.
    pub account_id: String,
    /// The account display name.
    pub account_name: String,
    /// The account currency code.
    pub currency_code: String,
    /// The balance in the account currency.
    pub balance: MoneyDto,
}

/// One day of the ledger month with its converted totals and events.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DayCashFlowDto {
    /// The ledger-local date, `YYYY-MM-DD`.
    pub date: String,
    /// Converted income on the day.
    pub income: MoneyDto,
    /// Converted expense on the day.
    pub expense: MoneyDto,
    /// Converted savings on the day.
    pub savings: MoneyDto,
    /// The day's transactions.
    pub transactions: Vec<TransactionDto>,
}

/// The dashboard for one ledger month.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DashboardDto {
    /// The ledger-local month, `YYYY-MM`.
    pub month: String,
    /// The reporting currency code.
    pub reporting_currency: String,
    /// Currencies used by the reporting currency and active accounts.
    pub available_currencies: Vec<String>,
    /// Native-currency balances of the active accounts.
    pub account_balances: Vec<AccountBalanceDto>,
    /// The net balance when rates are complete.
    pub net_balance: Option<MoneyDto>,
    /// Converted income for the month when rates are complete.
    pub monthly_income: Option<MoneyDto>,
    /// Converted expense for the month when rates are complete.
    pub monthly_expense: Option<MoneyDto>,
    /// Converted savings for the month when rates are complete.
    pub monthly_savings: Option<MoneyDto>,
    /// Daily cash flow when rates are complete.
    pub days: Vec<DayCashFlowDto>,
    /// The missing rate pair when the converted totals are incomplete.
    pub missing_rate: Option<MissingRateDto>,
}

/// The category ranking request for a ledger month.
#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRankingRequestDto {
    /// The ledger-local month, `YYYY-MM`; empty means the current month.
    #[serde(default)]
    pub month: String,
    /// The ranked category kind.
    pub kind: crate::master_data::CategoryKindDto,
}

/// One ranked category.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRankingRowDto {
    /// The category identity.
    pub category_id: String,
    /// The category display name.
    pub category_name: String,
    /// The group display name, when grouped.
    pub group_name: Option<String>,
    /// The converted total.
    pub total: MoneyDto,
    /// The number of matching transactions.
    pub transaction_count: u32,
}

/// The category ranking for one ledger month and kind.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CategoryRankingDto {
    /// The ledger-local month, `YYYY-MM`.
    pub month: String,
    /// The ranked kind.
    pub kind: crate::master_data::CategoryKindDto,
    /// The reporting currency code.
    pub reporting_currency: String,
    /// The sum of all rows when rates are complete.
    pub total: Option<MoneyDto>,
    /// Ranked rows when rates are complete.
    pub rows: Vec<CategoryRankingRowDto>,
    /// The missing rate pair when the report is incomplete.
    pub missing_rate: Option<MissingRateDto>,
}

fn money_dto(money: &Money) -> MoneyDto {
    MoneyDto {
        text: money_text(money),
        currency_code: money.currency().code().to_string(),
        scale: money.currency().scale(),
    }
}

impl From<MissingRateEntry> for MissingRateDto {
    fn from(entry: MissingRateEntry) -> Self {
        Self {
            source_currency: entry.source_currency,
            reporting_currency: entry.reporting_currency,
        }
    }
}

impl From<AccountBalanceEntry> for AccountBalanceDto {
    fn from(entry: AccountBalanceEntry) -> Self {
        Self {
            account_id: entry.account_id.to_string(),
            account_name: entry.account_name,
            currency_code: entry.currency_code,
            balance: money_dto(&entry.balance),
        }
    }
}

impl From<DayCashFlowEntry> for DayCashFlowDto {
    fn from(entry: DayCashFlowEntry) -> Self {
        Self {
            date: entry.date,
            income: money_dto(&entry.income),
            expense: money_dto(&entry.expense),
            savings: money_dto(&entry.savings),
            transactions: entry
                .transactions
                .into_iter()
                .map(TransactionDto::from)
                .collect(),
        }
    }
}

impl From<DashboardData> for DashboardDto {
    fn from(data: DashboardData) -> Self {
        Self {
            month: data.month,
            reporting_currency: data.reporting_currency,
            available_currencies: data.available_currencies,
            account_balances: data
                .account_balances
                .into_iter()
                .map(AccountBalanceDto::from)
                .collect(),
            net_balance: data.net_balance.as_ref().map(money_dto),
            monthly_income: data.monthly_income.as_ref().map(money_dto),
            monthly_expense: data.monthly_expense.as_ref().map(money_dto),
            monthly_savings: data.monthly_savings.as_ref().map(money_dto),
            days: data.days.into_iter().map(DayCashFlowDto::from).collect(),
            missing_rate: data.missing_rate.map(MissingRateDto::from),
        }
    }
}

impl From<CategoryRankingEntry> for CategoryRankingRowDto {
    fn from(entry: CategoryRankingEntry) -> Self {
        Self {
            category_id: entry.category_id.to_string(),
            category_name: entry.category_name,
            group_name: entry.group_name,
            total: money_dto(&entry.total),
            transaction_count: entry.transaction_count,
        }
    }
}

impl From<CategoryRankingData> for CategoryRankingDto {
    fn from(data: CategoryRankingData) -> Self {
        Self {
            month: data.month,
            kind: match data.kind {
                CategoryKind::Expense => crate::master_data::CategoryKindDto::Expense,
                CategoryKind::Income => crate::master_data::CategoryKindDto::Income,
            },
            reporting_currency: data.reporting_currency,
            total: data.total.as_ref().map(money_dto),
            rows: data
                .rows
                .into_iter()
                .map(CategoryRankingRowDto::from)
                .collect(),
            missing_rate: data.missing_rate.map(MissingRateDto::from),
        }
    }
}

pub(crate) fn map_dashboard_error(error: DashboardError) -> CommandError {
    let code = match error {
        DashboardError::NoActiveLedger | DashboardError::NotInitialized => ErrorCode::Unavailable,
        DashboardError::InvalidMonth => ErrorCode::InvalidRequest,
        DashboardError::Internal => ErrorCode::Internal,
    };
    CommandError::new(code, error.message_key())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn errors_map_to_stable_codes_and_keys() {
        assert_eq!(
            map_dashboard_error(DashboardError::NoActiveLedger).code,
            ErrorCode::Unavailable
        );
        assert_eq!(
            map_dashboard_error(DashboardError::InvalidMonth).code,
            ErrorCode::InvalidRequest
        );
        assert_eq!(
            map_dashboard_error(DashboardError::InvalidMonth).message_key,
            "errors.dashboard_month"
        );
        assert_eq!(
            map_dashboard_error(DashboardError::Internal).code,
            ErrorCode::Internal
        );
    }

    #[test]
    fn money_and_missing_rates_map_to_the_wire_shape() {
        let usd = core_domain::CurrencyScalePolicy::v1()
            .currency("USD")
            .unwrap();
        let dto = money_dto(&Money::new(1_234, usd));
        assert_eq!(dto.text, "12.34");
        assert_eq!(dto.currency_code, "USD");
        assert_eq!(dto.scale, 2);

        let missing = MissingRateDto::from(MissingRateEntry {
            source_currency: "CNY".to_string(),
            reporting_currency: "USD".to_string(),
        });
        assert_eq!(missing.source_currency, "CNY");
        assert_eq!(missing.reporting_currency, "USD");
    }
}
