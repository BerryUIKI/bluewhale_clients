import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { MasterDataDto, TransactionDto } from "@bluewhale/ipc";
import { AppProviders } from "../../app/providers";
import { routes } from "../../app/routes";
import { activeProfile, createFakeIpc, ledgerSummary } from "../../test/fake-ipc";
import { formatLedgerDate } from "./transaction-format";

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
      name: "Dollar savings",
      assetType: "savings",
      currencyCode: "USD",
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
  tags: [
    { id: "tag-1", name: "Travel", colorHex: "#112233", description: null, isArchived: false },
  ],
  counterparties: [{ id: "counterparty-1", kind: "person", name: "Alex", isArchived: false }],
};

function transaction(overrides: Partial<TransactionDto> & { id: string }): TransactionDto {
  return {
    kind: "expense",
    direction: "outflow",
    amountText: "12.34",
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

function renderTransactions(path: string, transactions: TransactionDto[] = []) {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  const fake = createFakeIpc({
    ledgers: [household],
    activeLedgerId: household.id,
    profile: activeProfile({
      id: household.id,
      name: "Household",
      currencyCode: "CNY",
      timeZoneIdentifier: "Asia/Shanghai",
    }),
    masterData,
    transactions,
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders ipc={fake.ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return fake;
}

describe("the transaction history", () => {
  it("lists entries with joined names and day headings", async () => {
    renderTransactions("/transactions", [
      transaction({
        id: "transaction-1",
        note: "Lunch",
        tagIds: ["tag-1"],
        counterpartyId: "counterparty-1",
      }),
    ]);

    expect(await screen.findByText("−12.34 CNY")).toBeInTheDocument();
    const row = screen.getByText("−12.34 CNY").closest("li")!;
    expect(
      screen.getByRole("heading", { name: formatLedgerDate("2026-11-27", "en") }),
    ).toBeInTheDocument();
    expect(within(row).getByText("Cash")).toBeInTheDocument();
    expect(within(row).getByText("Food")).toBeInTheDocument();
    expect(within(row).getByText("Lunch")).toBeInTheDocument();
    expect(within(row).getByText("Travel")).toBeInTheDocument();
    expect(within(row).getByText("Alex")).toBeInTheDocument();
    expect(within(row).getByText("09:30")).toBeInTheDocument();
    expect(within(row).getByText("Expense")).toBeInTheDocument();
  });

  it("filters by search text and kind", async () => {
    const user = userEvent.setup();
    renderTransactions("/transactions", [
      transaction({ id: "transaction-1", note: "Lunch" }),
      transaction({
        id: "transaction-2",
        kind: "income",
        direction: "inflow",
        amountText: "5000.00",
        categoryId: "category-2",
        note: "Monthly salary",
        occurredAtLocal: "2026-11-28T10:00",
        occurredOn: "2026-11-28",
      }),
    ]);
    await screen.findByText("Lunch");
    expect(screen.getByText("Monthly salary")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search"), "lunch");
    await waitFor(() => expect(screen.queryByText("Monthly salary")).not.toBeInTheDocument());
    expect(await screen.findByText("Lunch")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search"));
    await user.selectOptions(await screen.findByLabelText("Kind"), "income");
    await waitFor(() => expect(screen.queryByText("Lunch")).not.toBeInTheDocument());
    expect(await screen.findByText("Monthly salary")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
  });

  it("shows an empty state without transactions", async () => {
    renderTransactions("/transactions");

    expect(await screen.findByText("No transactions yet")).toBeInTheDocument();
    expect(screen.getByText("Record your first expense, income, or transfer.")).toBeInTheDocument();
  });

  it("deletes a transaction and restores it from recovery", async () => {
    const user = userEvent.setup();
    const fake = renderTransactions("/transactions", [
      transaction({ id: "transaction-1", note: "Lunch" }),
    ]);
    await screen.findByText("Lunch");

    const row = screen.getByText("Lunch").closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByText("Transaction deleted. It no longer counts in totals."),
    ).toBeInTheDocument();
    expect(fake.state.transactions[0]?.isDeleted).toBe(true);

    await user.click(screen.getByRole("link", { name: "Open Recovery" }));
    expect(await screen.findByRole("heading", { name: "Recovery" })).toBeInTheDocument();
    expect(await screen.findByText("Deleted")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(await screen.findByText("Transaction restored.")).toBeInTheDocument();
    expect(fake.state.transactions[0]?.isDeleted).toBe(false);

    await user.click(screen.getByRole("link", { name: "Transaction history" }));
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
  });

  it("does not offer editing for opening balances", async () => {
    renderTransactions("/transactions", [
      transaction({
        id: "transaction-1",
        kind: "opening_balance",
        direction: "opening",
        amountText: "250.00",
        categoryId: null,
        note: "Opening balance",
      }),
    ]);
    await screen.findByText("250.00 CNY");

    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});

describe("the transaction editor", () => {
  it("creates an expense", async () => {
    const user = userEvent.setup();
    const fake = renderTransactions("/transactions/new");

    await screen.findByRole("heading", { name: "New transaction" });
    await user.type(await screen.findByLabelText("Amount (CNY)"), "12.34");
    await user.selectOptions(await screen.findByLabelText("Category"), "category-1");
    await user.type(screen.getByLabelText("Note"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Transaction recorded.")).toBeInTheDocument();
    await waitFor(() => expect(fake.state.transactions).toHaveLength(1));
    const created = fake.state.transactions[0]!;
    expect(created.kind).toBe("expense");
    expect(created.amountText).toBe("12.34");
    expect(created.currencyCode).toBe("CNY");
    expect(created.accountId).toBe("account-1");
    expect(created.categoryId).toBe("category-1");
    expect(created.note).toBe("Lunch");
    expect(await screen.findByText("−12.34 CNY")).toBeInTheDocument();
  });

  it("creates a cross-currency transfer with both amounts", async () => {
    const user = userEvent.setup();
    const fake = renderTransactions("/transactions/new");
    await screen.findByRole("heading", { name: "New transaction" });

    await user.selectOptions(await screen.findByLabelText("Kind"), "transfer");
    await user.type(await screen.findByLabelText("Amount (CNY)"), "100.00");
    await user.selectOptions(screen.getByLabelText("Destination account"), "account-2");
    await user.type(screen.getByLabelText("Received amount (USD)"), "14.20");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Transaction recorded.")).toBeInTheDocument();
    await waitFor(() => expect(fake.state.transactions).toHaveLength(1));
    const created = fake.state.transactions[0]!;
    expect(created.kind).toBe("transfer");
    expect(created.destinationAccountId).toBe("account-2");
    expect(created.destinationAmountText).toBe("14.20");
    expect(created.destinationCurrencyCode).toBe("USD");
    expect(await screen.findByText("100.00 CNY → 14.20 USD")).toBeInTheDocument();
  });

  it("edits an existing transaction", async () => {
    const user = userEvent.setup();
    const fake = renderTransactions("/transactions", [
      transaction({ id: "transaction-1", note: "Lunch" }),
    ]);
    await screen.findByText("Lunch");

    const row = screen.getByText("Lunch").closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    expect(await screen.findByRole("heading", { name: "Edit transaction" })).toBeInTheDocument();

    const amount = await screen.findByLabelText("Amount (CNY)");
    await user.clear(amount);
    await user.type(amount, "20.00");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Transaction updated.")).toBeInTheDocument();
    await waitFor(() => expect(fake.state.transactions[0]?.amountText).toBe("20.00"));
    expect(fake.state.transactions[0]?.id).toBe("transaction-1");
    expect(await screen.findByText("−20.00 CNY")).toBeInTheDocument();
  });

  it("explains that an opening balance cannot be edited", async () => {
    renderTransactions("/transactions/transaction-1/edit", [
      transaction({
        id: "transaction-1",
        kind: "opening_balance",
        direction: "opening",
        amountText: "250.00",
        categoryId: null,
      }),
    ]);

    expect(
      await screen.findByRole("heading", { name: "Opening balances cannot be edited" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("requires a category for an expense", async () => {
    const user = userEvent.setup();
    const fake = renderTransactions("/transactions/new");
    await screen.findByRole("heading", { name: "New transaction" });

    await user.type(await screen.findByLabelText("Amount (CNY)"), "12.34");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Choose a category.")).toBeInTheDocument();
    expect(fake.state.transactions).toHaveLength(0);
  });
});
