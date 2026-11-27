//! Dashboard and report operations for the open ledger.
//!
//! The dashboard use case reports native account balances, the net balance,
//! monthly totals, and daily cash flow in the ledger month. When a conversion
//! rate is missing the dashboard returns an explicit incomplete result: native
//! balances are kept, converted totals are absent, and the missing currency
//! pair is reported. The category ranking follows the same rule.

use core_application::{ApplicationError, LoadCategoryRankingUseCase, LoadLedgerDashboardUseCase};
use core_domain::{
    CategoryId, CategoryKind, LedgerReadSnapshotRepository, LedgerSettings,
    LedgerSettingsRepository, Money, account_balance,
};
use jiff::Timestamp;
use jiff::civil::Date;
use jiff::tz::TimeZone;

use crate::error::DashboardError;
use crate::transactions::{TransactionEntry, entry as transaction_entry};

/// The repositories a dashboard or report operation needs.
pub trait DashboardStore: LedgerReadSnapshotRepository + LedgerSettingsRepository {}

impl<T> DashboardStore for T where T: LedgerReadSnapshotRepository + LedgerSettingsRepository {}

/// A missing conversion rate between two currencies.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MissingRateEntry {
    /// The currency that needs conversion.
    pub source_currency: String,
    /// The reporting currency.
    pub reporting_currency: String,
}

/// One account's balance in its native currency.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountBalanceEntry {
    /// The account identity.
    pub account_id: core_domain::AccountId,
    /// The account display name.
    pub account_name: String,
    /// The account currency code.
    pub currency_code: String,
    /// The balance in the account currency.
    pub balance: Money,
}

/// One day of the ledger month with its converted totals and events.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DayCashFlowEntry {
    /// The ledger-local date, `YYYY-MM-DD`.
    pub date: String,
    /// Converted income on the day.
    pub income: Money,
    /// Converted expense on the day.
    pub expense: Money,
    /// Converted savings (income minus expense) on the day.
    pub savings: Money,
    /// The day's transactions.
    pub transactions: Vec<TransactionEntry>,
}

/// The dashboard for one ledger month.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DashboardData {
    /// The ledger-local month, `YYYY-MM`.
    pub month: String,
    /// The reporting currency code.
    pub reporting_currency: String,
    /// Currencies used by the reporting currency and active accounts.
    pub available_currencies: Vec<String>,
    /// Native-currency balances of the active accounts.
    pub account_balances: Vec<AccountBalanceEntry>,
    /// The net balance in the reporting currency when rates are complete.
    pub net_balance: Option<Money>,
    /// Converted income for the month when rates are complete.
    pub monthly_income: Option<Money>,
    /// Converted expense for the month when rates are complete.
    pub monthly_expense: Option<Money>,
    /// Converted savings for the month when rates are complete.
    pub monthly_savings: Option<Money>,
    /// Daily cash flow when rates are complete.
    pub days: Vec<DayCashFlowEntry>,
    /// The missing rate pair when the converted totals are incomplete.
    pub missing_rate: Option<MissingRateEntry>,
}

/// One ranked category in a report.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CategoryRankingEntry {
    /// The category identity.
    pub category_id: CategoryId,
    /// The category display name.
    pub category_name: String,
    /// The group display name, when grouped.
    pub group_name: Option<String>,
    /// The converted total in the reporting currency.
    pub total: Money,
    /// The number of matching transactions.
    pub transaction_count: u32,
}

/// The category ranking for one ledger month and kind.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CategoryRankingData {
    /// The ledger-local month, `YYYY-MM`.
    pub month: String,
    /// The ranked kind.
    pub kind: CategoryKind,
    /// The reporting currency code.
    pub reporting_currency: String,
    /// The sum of all rows when rates are complete.
    pub total: Option<Money>,
    /// Ranked rows when rates are complete.
    pub rows: Vec<CategoryRankingEntry>,
    /// The missing rate pair when the report is incomplete.
    pub missing_rate: Option<MissingRateEntry>,
}

/// Loads the dashboard for a ledger month, or the current ledger month when
/// `month` is empty.
///
/// # Errors
///
/// Returns [`DashboardError::InvalidMonth`] for a malformed month,
/// [`DashboardError::NotInitialized`] for a database without settings, and
/// [`DashboardError::Internal`] for another local failure. A missing exchange
/// rate is reported in [`DashboardData::missing_rate`], not as an error.
pub fn load(
    store: &impl DashboardStore,
    month: Option<&str>,
) -> Result<DashboardData, DashboardError> {
    let (settings, zone) = settings_and_zone(store)?;
    let (month, instant) = parse_month(month, &zone)?;
    let reporting_currency = settings.currency().code().to_string();
    match LoadLedgerDashboardUseCase::new(store).execute(instant, None) {
        Ok(dashboard) => Ok(DashboardData {
            month,
            reporting_currency,
            available_currencies: dashboard
                .available_currencies
                .iter()
                .map(|currency| currency.code().to_string())
                .collect(),
            account_balances: dashboard
                .account_balances
                .iter()
                .map(|summary| AccountBalanceEntry {
                    account_id: summary.account.id(),
                    account_name: summary.account.name().to_string(),
                    currency_code: summary.account.currency().code().to_string(),
                    balance: summary.balance.clone(),
                })
                .collect(),
            net_balance: Some(dashboard.net_balance),
            monthly_income: Some(dashboard.monthly_statistics.income().clone()),
            monthly_expense: Some(dashboard.monthly_statistics.expense().clone()),
            monthly_savings: Some(dashboard.monthly_savings),
            days: dashboard
                .daily_cash_flow
                .iter()
                .map(|day| DayCashFlowEntry {
                    date: local_date(day.interval.start(), &zone),
                    income: day.income.clone(),
                    expense: day.expense.clone(),
                    savings: day.savings.clone(),
                    transactions: day
                        .transactions
                        .iter()
                        .map(|transaction| transaction_entry(transaction, &zone))
                        .collect(),
                })
                .collect(),
            missing_rate: None,
        }),
        Err(ApplicationError::MissingExchangeRate { source, reporting }) => {
            let balances = native_balances(store)?;
            let mut currencies: Vec<String> = balances
                .iter()
                .map(|balance| balance.currency_code.clone())
                .collect();
            currencies.push(reporting.code().to_string());
            currencies.sort();
            currencies.dedup();
            Ok(DashboardData {
                month,
                reporting_currency: reporting.code().to_string(),
                available_currencies: currencies,
                account_balances: balances,
                net_balance: None,
                monthly_income: None,
                monthly_expense: None,
                monthly_savings: None,
                days: Vec::new(),
                missing_rate: Some(MissingRateEntry {
                    source_currency: source.code().to_string(),
                    reporting_currency: reporting.code().to_string(),
                }),
            })
        }
        Err(error) => Err(map_application_error(error)),
    }
}

/// Loads the category ranking for a ledger month, or the current ledger month
/// when `month` is empty.
///
/// # Errors
///
/// Returns [`DashboardError::InvalidMonth`] for a malformed month,
/// [`DashboardError::NotInitialized`] for a database without settings, and
/// [`DashboardError::Internal`] for another local failure. A missing exchange
/// rate is reported in [`CategoryRankingData::missing_rate`], not as an error.
pub fn category_ranking(
    store: &impl DashboardStore,
    month: Option<&str>,
    kind: CategoryKind,
) -> Result<CategoryRankingData, DashboardError> {
    let (_settings, zone) = settings_and_zone(store)?;
    let (month, instant) = parse_month(month, &zone)?;
    match LoadCategoryRankingUseCase::new(store).execute(instant, kind, None) {
        Ok(report) => Ok(CategoryRankingData {
            month,
            kind,
            reporting_currency: report.reporting_currency.code().to_string(),
            total: Some(report.total),
            rows: report
                .rows
                .into_iter()
                .map(|row| CategoryRankingEntry {
                    category_id: row.category_id,
                    category_name: row.category_name,
                    group_name: row.group_name,
                    total: row.total,
                    transaction_count: row.transaction_count,
                })
                .collect(),
            missing_rate: None,
        }),
        Err(ApplicationError::MissingExchangeRate { source, reporting }) => {
            Ok(CategoryRankingData {
                month,
                kind,
                reporting_currency: reporting.code().to_string(),
                total: None,
                rows: Vec::new(),
                missing_rate: Some(MissingRateEntry {
                    source_currency: source.code().to_string(),
                    reporting_currency: reporting.code().to_string(),
                }),
            })
        }
        Err(error) => Err(map_application_error(error)),
    }
}

fn settings_and_zone(
    store: &impl LedgerSettingsRepository,
) -> Result<(LedgerSettings, TimeZone), DashboardError> {
    let settings = store.settings()?.ok_or(DashboardError::NotInitialized)?;
    let zone =
        TimeZone::get(settings.calendar().identifier()).map_err(|_| DashboardError::Internal)?;
    Ok((settings, zone))
}

fn parse_month(
    input: Option<&str>,
    zone: &TimeZone,
) -> Result<(String, Timestamp), DashboardError> {
    if let Some(value) = input.filter(|value| !value.trim().is_empty()) {
        let value = value.trim();
        let (year, month) = value.split_once('-').ok_or(DashboardError::InvalidMonth)?;
        let year: i16 = year.parse().map_err(|_| DashboardError::InvalidMonth)?;
        let month: i8 = month.parse().map_err(|_| DashboardError::InvalidMonth)?;
        let date = Date::new(year, month, 15).map_err(|_| DashboardError::InvalidMonth)?;
        let instant = date
            .at(12, 0, 0, 0)
            .to_zoned_datetime(zone.clone())
            .map(|zoned| zoned.timestamp())
            .map_err(|_| DashboardError::InvalidMonth)?;
        Ok((format!("{year:04}-{month:02}"), instant))
    } else {
        let now = Timestamp::now();
        let date = now.to_zoned_datetime(zone.clone()).date();
        Ok((format!("{:04}-{:02}", date.year(), date.month()), now))
    }
}

fn local_date(instant: Timestamp, zone: &TimeZone) -> String {
    let date = instant.to_zoned_datetime(zone.clone()).date();
    format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day())
}

fn native_balances(
    store: &impl LedgerReadSnapshotRepository,
) -> Result<Vec<AccountBalanceEntry>, DashboardError> {
    let snapshot = store.snapshot()?;
    let mut balances = Vec::new();
    for account in &snapshot.active_accounts {
        let balance = account_balance(
            account.id(),
            account.currency(),
            &snapshot.active_transactions,
        )
        .map_err(|_| DashboardError::Internal)?;
        balances.push(AccountBalanceEntry {
            account_id: account.id(),
            account_name: account.name().to_string(),
            currency_code: account.currency().code().to_string(),
            balance,
        });
    }
    Ok(balances)
}

fn map_application_error(error: ApplicationError) -> DashboardError {
    match error {
        ApplicationError::LedgerNotInitialized => DashboardError::NotInitialized,
        _ => DashboardError::Internal,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::master_data;
    use crate::transactions::{
        CreateTransactionInput, TransactionDraftInput, create as create_transaction,
    };
    use core_application::{
        DefaultLedgerContent, InitializeLedgerRequest, InitializeLedgerUseCase,
    };
    use core_domain::{AssetAccountType, CurrencyScalePolicy, TransactionKind};
    use core_persistence::SqliteLedger;

    fn store() -> SqliteLedger {
        let ledger = SqliteLedger::open_in_memory(&"55".repeat(32)).unwrap();
        let outcome = InitializeLedgerUseCase::new(
            &ledger,
            CurrencyScalePolicy::v1(),
            &crate::clock::SystemClock,
            &crate::clock::Uuidv7Source,
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

    fn id_of_account(store: &impl crate::master_data::MasterDataStore, name: &str) -> String {
        master_data::load(store)
            .unwrap()
            .accounts
            .into_iter()
            .find(|account| account.name == name)
            .unwrap()
            .id
            .to_string()
    }

    fn id_of_category(store: &impl crate::master_data::MasterDataStore, name: &str) -> String {
        master_data::load(store)
            .unwrap()
            .categories
            .into_iter()
            .find(|category| category.name == name)
            .unwrap()
            .id
            .to_string()
    }

    fn create(store: &SqliteLedger, draft: TransactionDraftInput) -> TransactionEntry {
        create_transaction(store, CreateTransactionInput { draft }).unwrap()
    }

    fn draft(
        kind: TransactionKind,
        amount: &str,
        occurred_at: &str,
        account_id: &str,
        category_id: Option<&str>,
    ) -> TransactionDraftInput {
        TransactionDraftInput {
            kind,
            amount_text: amount.to_string(),
            destination_amount_text: None,
            occurred_at: occurred_at.to_string(),
            account_id: account_id.to_string(),
            destination_account_id: None,
            category_id: category_id.map(ToString::to_string),
            tag_ids: Vec::new(),
            counterparty_id: None,
            note: None,
        }
    }

    #[test]
    fn a_complete_dashboard_reports_native_balances_and_month_totals() {
        let store = store();
        let cash = id_of_account(&store, "Cash");
        let food = id_of_category(&store, "Food");
        let salary = id_of_category(&store, "Salary");
        let wallet = master_data::create_account(
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

        create(
            &store,
            draft(
                TransactionKind::Expense,
                "88.50",
                "2026-11-27T09:30",
                &cash,
                Some(food.as_str()),
            ),
        );
        create(
            &store,
            draft(
                TransactionKind::Income,
                "5000.00",
                "2026-11-27T10:00",
                &cash,
                Some(salary.as_str()),
            ),
        );
        let mut transfer = draft(
            TransactionKind::Transfer,
            "100.00",
            "2026-11-27T11:00",
            &cash,
            None,
        );
        transfer.destination_account_id = Some(wallet.id.to_string());
        create(&store, transfer);

        let dashboard = load(&store, Some("2026-11")).unwrap();

        assert_eq!(dashboard.month, "2026-11");
        assert_eq!(dashboard.reporting_currency, "CNY");
        assert_eq!(dashboard.available_currencies, vec!["CNY".to_string()]);
        assert!(dashboard.missing_rate.is_none());
        assert_eq!(
            dashboard.net_balance.as_ref().unwrap().minor_units(),
            491_150
        );
        assert_eq!(
            dashboard.monthly_income.as_ref().unwrap().minor_units(),
            500_000
        );
        assert_eq!(
            dashboard.monthly_expense.as_ref().unwrap().minor_units(),
            8_850
        );
        assert_eq!(
            dashboard.monthly_savings.as_ref().unwrap().minor_units(),
            491_150
        );
        let cash_balance = dashboard
            .account_balances
            .iter()
            .find(|balance| balance.account_name == "Cash")
            .unwrap();
        assert_eq!(cash_balance.balance.minor_units(), 481_150);
        assert_eq!(cash_balance.currency_code, "CNY");
        let wallet_balance = dashboard
            .account_balances
            .iter()
            .find(|balance| balance.account_name == "Wallet")
            .unwrap();
        assert_eq!(wallet_balance.balance.minor_units(), 10_000);

        let day = dashboard
            .days
            .iter()
            .find(|day| day.date == "2026-11-27")
            .unwrap();
        assert_eq!(day.transactions.len(), 3);
        assert_eq!(day.income.minor_units(), 500_000);
        assert_eq!(day.expense.minor_units(), 8_850);
        assert_eq!(day.savings.minor_units(), 491_150);
    }

    #[test]
    fn a_missing_rate_returns_an_incomplete_dashboard_with_native_balances() {
        let store = store();
        let food = id_of_category(&store, "Food");
        let dollar = master_data::create_account(
            &store,
            master_data::CreateAccountInput {
                name: "Dollar wallet".to_string(),
                asset_type: AssetAccountType::Cash,
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
        create(
            &store,
            draft(
                TransactionKind::Expense,
                "25.00",
                "2026-11-27T09:30",
                &dollar.id.to_string(),
                Some(food.as_str()),
            ),
        );

        let dashboard = load(&store, Some("2026-11")).unwrap();

        assert_eq!(
            dashboard.missing_rate,
            Some(MissingRateEntry {
                source_currency: "USD".to_string(),
                reporting_currency: "CNY".to_string(),
            })
        );
        assert!(dashboard.net_balance.is_none());
        assert!(dashboard.monthly_income.is_none());
        assert!(dashboard.monthly_expense.is_none());
        assert!(dashboard.monthly_savings.is_none());
        assert!(dashboard.days.is_empty());
        assert_eq!(dashboard.account_balances.len(), 2);
        assert!(
            dashboard
                .account_balances
                .iter()
                .any(|balance| balance.currency_code == "USD")
        );
    }

    #[test]
    fn category_ranking_orders_rows_and_respects_the_month_and_kind() {
        let store = store();
        let cash = id_of_account(&store, "Cash");
        let food = id_of_category(&store, "Food");
        let transport = id_of_category(&store, "Transport");
        let salary = id_of_category(&store, "Salary");
        create(
            &store,
            draft(
                TransactionKind::Expense,
                "88.50",
                "2026-11-27T09:30",
                &cash,
                Some(food.as_str()),
            ),
        );
        create(
            &store,
            draft(
                TransactionKind::Expense,
                "20.00",
                "2026-11-27T12:00",
                &cash,
                Some(transport.as_str()),
            ),
        );
        create(
            &store,
            draft(
                TransactionKind::Income,
                "5000.00",
                "2026-11-27T10:00",
                &cash,
                Some(salary.as_str()),
            ),
        );
        create(
            &store,
            draft(
                TransactionKind::Expense,
                "5.00",
                "2026-10-15T09:30",
                &cash,
                Some(food.as_str()),
            ),
        );

        let expenses = category_ranking(&store, Some("2026-11"), CategoryKind::Expense).unwrap();
        assert_eq!(expenses.month, "2026-11");
        assert_eq!(expenses.reporting_currency, "CNY");
        assert_eq!(expenses.rows.len(), 2);
        assert_eq!(expenses.rows[0].category_name, "Food");
        assert_eq!(expenses.rows[0].total.minor_units(), 8_850);
        assert_eq!(expenses.rows[0].transaction_count, 1);
        assert_eq!(expenses.rows[1].category_name, "Transport");
        assert_eq!(expenses.rows[1].total.minor_units(), 2_000);
        assert_eq!(expenses.total.as_ref().unwrap().minor_units(), 10_850);

        let income = category_ranking(&store, Some("2026-11"), CategoryKind::Income).unwrap();
        assert_eq!(income.rows.len(), 1);
        assert_eq!(income.rows[0].category_name, "Salary");
        assert_eq!(income.total.as_ref().unwrap().minor_units(), 500_000);

        let october = category_ranking(&store, Some("2026-10"), CategoryKind::Expense).unwrap();
        assert_eq!(october.rows.len(), 1);
        assert_eq!(october.total.as_ref().unwrap().minor_units(), 500);

        assert_eq!(
            category_ranking(&store, Some("2026-13"), CategoryKind::Expense).unwrap_err(),
            DashboardError::InvalidMonth
        );
    }

    #[test]
    fn category_ranking_reports_a_missing_rate() {
        let store = store();
        let food = id_of_category(&store, "Food");
        let dollar = master_data::create_account(
            &store,
            master_data::CreateAccountInput {
                name: "Dollar wallet".to_string(),
                asset_type: AssetAccountType::Cash,
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
        create(
            &store,
            draft(
                TransactionKind::Expense,
                "25.00",
                "2026-11-27T09:30",
                &dollar.id.to_string(),
                Some(food.as_str()),
            ),
        );

        let report = category_ranking(&store, Some("2026-11"), CategoryKind::Expense).unwrap();

        assert_eq!(
            report.missing_rate,
            Some(MissingRateEntry {
                source_currency: "USD".to_string(),
                reporting_currency: "CNY".to_string(),
            })
        );
        assert!(report.total.is_none());
        assert!(report.rows.is_empty());
    }

    #[test]
    fn an_uninitialized_store_is_reported() {
        let store = SqliteLedger::open_in_memory(&"66".repeat(32)).unwrap();
        assert_eq!(
            load(&store, Some("2026-11")).unwrap_err(),
            DashboardError::NotInitialized
        );
        assert_eq!(
            category_ranking(&store, Some("2026-11"), CategoryKind::Expense).unwrap_err(),
            DashboardError::NotInitialized
        );
    }
}
