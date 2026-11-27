import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type {
  CategoryRankingDto,
  DashboardDto,
  MasterDataDto,
  TransactionDto,
} from "@bluewhale/ipc";
import { AppProviders } from "../../app/providers";
import { routes } from "../../app/routes";
import { ledgerMonth, shiftMonth } from "../../lib/dates";
import {
  activeProfile,
  categoryRankingData,
  createFakeIpc,
  dashboardData,
  ledgerSummary,
  money,
} from "../../test/fake-ipc";

const masterData: MasterDataDto = {
  accounts: [
    {
      id: "account-1",
      name: "Cash",
      assetType: "cash",
      currencyCode: "CNY",
      tagIds: [],
      ownerId: null,
      customGroupId: null,
      note: "",
      isHidden: false,
      isIncludedInNetWorth: true,
      isArchived: false,
    },
    {
      id: "account-2",
      name: "Wallet",
      assetType: "cash",
      currencyCode: "CNY",
      tagIds: [],
      ownerId: null,
      customGroupId: null,
      note: "",
      isHidden: false,
      isIncludedInNetWorth: true,
      isArchived: false,
    },
  ],
  accountGroups: [],
  categoryGroups: [],
  categories: [
    { id: "category-1", name: "Food", kind: "expense", groupId: null, isArchived: false },
    { id: "category-2", name: "Salary", kind: "income", groupId: null, isArchived: false },
  ],
  tags: [],
  counterparties: [],
};

function transaction(overrides: Partial<TransactionDto> & { id: string }): TransactionDto {
  return {
    kind: "expense",
    direction: "outflow",
    amountText: "88.50",
    currencyCode: "CNY",
    scale: 2,
    destinationAmountText: null,
    destinationCurrencyCode: null,
    destinationScale: null,
    occurredAt: "2026-11-27T01:30:00Z",
    occurredOn: "2026-11-27",
    occurredAtLocal: "2026-11-27T09:30",
    accountId: "account-1",
    destinationAccountId: null,
    categoryId: "category-1",
    tagIds: [],
    counterpartyId: null,
    note: null,
    isDeleted: false,
    createdAt: "2026-11-27T01:30:00Z",
    ...overrides,
  };
}

function renderPage(
  path: string,
  options: { dashboard?: DashboardDto; ranking?: CategoryRankingDto } = {},
) {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  const fake = createFakeIpc({
    ledgers: [household],
    activeLedgerId: household.id,
    profile: activeProfile({
      id: household.id,
      name: "Household",
      currencyCode: "CNY",
      timeZoneIdentifier: "UTC",
    }),
    masterData,
    dashboard: options.dashboard ?? dashboardData(),
    categoryRanking: options.ranking ?? categoryRankingData(),
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const rendered = render(
    <AppProviders ipc={fake.ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { fake, ...rendered };
}

const completeDashboard = dashboardData({
  month: "2026-11",
  accountBalances: [
    { accountId: "account-1", accountName: "Cash", currencyCode: "CNY", balance: money("4811.50") },
    {
      accountId: "account-2",
      accountName: "Wallet",
      currencyCode: "CNY",
      balance: money("100.00"),
    },
  ],
  netBalance: money("4911.50"),
  monthlyIncome: money("5000.00"),
  monthlyExpense: money("88.50"),
  monthlySavings: money("4911.50"),
  days: [
    {
      date: "2026-11-27",
      income: money("5000.00"),
      expense: money("88.50"),
      savings: money("4911.50"),
      transactions: [
        transaction({ id: "transaction-1", note: "Lunch" }),
        transaction({
          id: "transaction-2",
          kind: "income",
          direction: "inflow",
          amountText: "5000.00",
          categoryId: "category-2",
          occurredAtLocal: "2026-11-27T10:00",
        }),
      ],
    },
    {
      date: "2026-11-26",
      income: money("0.00"),
      expense: money("0.00"),
      savings: money("0.00"),
      transactions: [],
    },
  ],
});

describe("the dashboard", () => {
  it("shows balances, monthly totals, and day detail", async () => {
    const { container } = renderPage("/", { dashboard: completeDashboard });

    expect(await screen.findByRole("heading", { name: "Balances" })).toBeInTheDocument();
    expect(screen.getByText("Cash")).toBeInTheDocument();
    expect(screen.getByText("4811.50")).toBeInTheDocument();
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
    const netCard = screen.getByText("Net balance").closest("li")!;
    expect(within(netCard).getByText("4911.50")).toBeInTheDocument();
    const monthSection = screen
      .getByRole("heading", { name: "Monthly totals" })
      .closest("section")!;
    const incomeCard = within(monthSection).getByText("Income").closest("div")!;
    expect(within(incomeCard).getByText("5000.00")).toBeInTheDocument();
    const expenseCard = within(monthSection).getByText("Expense").closest("div")!;
    expect(within(expenseCard).getByText("88.50")).toBeInTheDocument();
    const savingsCard = within(monthSection).getByText("Savings").closest("div")!;
    expect(within(savingsCard).getByText("4911.50")).toBeInTheDocument();

    const day = screen.getByText("Nov 27, 2026").closest("details")!;
    expect(day).toHaveTextContent("5000.00");
    expect(day).toHaveTextContent("88.50");
    expect(within(day).getByText("Lunch")).toBeInTheDocument();
    expect(within(day).getByText("−88.50 CNY")).toBeInTheDocument();
    expect(within(day).getByText("+5000.00 CNY")).toBeInTheDocument();
    expect(container.querySelectorAll("details")).toHaveLength(1);
  });

  it("moves to the previous month and requests it", async () => {
    const user = userEvent.setup();
    const { fake } = renderPage("/", { dashboard: completeDashboard });
    await screen.findByRole("heading", { name: "Balances" });
    const current = ledgerMonth("UTC");

    await user.click(screen.getByRole("button", { name: "Previous month" }));

    const expected = shiftMonth(current, -1);
    await waitFor(() => expect(fake.state.lastDashboardMonth).toBe(expected));
    expect(screen.getByLabelText("Month")).toHaveValue(expected);
  });

  it("shows the explicit missing-rate state without converted totals", async () => {
    renderPage("/", {
      dashboard: dashboardData({
        month: "2026-11",
        accountBalances: [
          {
            accountId: "account-1",
            accountName: "Cash",
            currencyCode: "CNY",
            balance: money("4811.50"),
          },
          {
            accountId: "account-3",
            accountName: "Dollar wallet",
            currencyCode: "USD",
            balance: money("25.00", "USD"),
          },
        ],
        netBalance: null,
        monthlyIncome: null,
        monthlyExpense: null,
        monthlySavings: null,
        days: [],
        missingRate: { sourceCurrency: "USD", reportingCurrency: "CNY" },
      }),
    });

    expect(await screen.findByText("Exchange rate missing")).toBeInTheDocument();
    expect(screen.getByText(/No rate from USD to CNY/)).toBeInTheDocument();
    expect(screen.getByText("Dollar wallet")).toBeInTheDocument();
    expect(screen.getByText("25.00")).toBeInTheDocument();
    expect(screen.queryByText("Net balance")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Daily cash flow" })).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(3);
  });
});

describe("the reports page", () => {
  it("shows the cash flow and the category ranking", async () => {
    const user = userEvent.setup();
    const { fake } = renderPage("/reports", {
      dashboard: completeDashboard,
      ranking: categoryRankingData({
        month: "2026-11",
        kind: "expense",
        total: money("108.50"),
        rows: [
          {
            categoryId: "category-1",
            categoryName: "Food",
            groupName: "Essentials",
            total: money("88.50"),
            transactionCount: 1,
          },
          {
            categoryId: "category-3",
            categoryName: "Transport",
            groupName: null,
            total: money("20.00"),
            transactionCount: 2,
          },
        ],
      }),
    });

    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cash flow" })).toBeInTheDocument();
    const cashSection = screen.getByRole("heading", { name: "Cash flow" }).closest("section")!;
    expect(await within(cashSection).findByText("5000.00")).toBeInTheDocument();
    expect(within(cashSection).getByText("88.50")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Category ranking" })).toBeInTheDocument();
    expect(await screen.findByText("Essentials · Food")).toBeInTheDocument();
    const foodRow = screen.getByText("Essentials · Food").closest("tr")!;
    expect(within(foodRow).getByText("88.50")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("108.50")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Kind"), "income");
    await waitFor(() => expect(fake.state.lastRankingKind).toBe("income"));
  });

  it("shows the missing-rate state for an incomplete ranking", async () => {
    renderPage("/reports", {
      dashboard: completeDashboard,
      ranking: categoryRankingData({
        month: "2026-11",
        kind: "expense",
        total: null,
        rows: [],
        missingRate: { sourceCurrency: "USD", reportingCurrency: "CNY" },
      }),
    });

    expect(await screen.findByText("Exchange rate missing")).toBeInTheDocument();
    expect(screen.getByText(/No rate from USD to CNY/)).toBeInTheDocument();
    expect(screen.queryByText("No ranking to show")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
