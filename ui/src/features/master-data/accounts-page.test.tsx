import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AccountDto, MasterDataDto } from "@bluewhale/ipc";
import { AppProviders } from "../../app/providers";
import { routes } from "../../app/routes";
import { activeProfile, createFakeIpc, emptyMasterData, ledgerSummary } from "../../test/fake-ipc";

function account(overrides: Partial<AccountDto> & { id: string; name: string }): AccountDto {
  return {
    assetType: "checking",
    currencyCode: "USD",
    tagIds: [],
    ownerId: null,
    customGroupId: null,
    note: "",
    isHidden: false,
    isIncludedInNetWorth: true,
    isArchived: false,
    ...overrides,
  };
}

function renderAccounts(masterData: Partial<MasterDataDto> = {}) {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  const fake = createFakeIpc({
    ledgers: [household],
    activeLedgerId: household.id,
    profile: activeProfile({ id: household.id, name: "Household" }),
    masterData: { ...emptyMasterData(), ...masterData },
  });
  const router = createMemoryRouter(routes, { initialEntries: ["/accounts"] });
  render(
    <AppProviders ipc={fake.ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return fake;
}

describe("the accounts page", () => {
  it("lists accounts with their group, tags, and owner", async () => {
    renderAccounts({
      accounts: [
        account({
          id: "account-1",
          name: "Main checking",
          assetType: "checking",
          tagIds: ["tag-1"],
          ownerId: "counterparty-1",
          customGroupId: "group-1",
          note: "Joint account",
        }),
      ],
      accountGroups: [{ id: "group-1", name: "Bank", isArchived: false }],
      tags: [
        {
          id: "tag-1",
          name: "Travel",
          colorHex: "#112233",
          description: null,
          isArchived: false,
        },
      ],
      counterparties: [
        { id: "counterparty-1", kind: "household_member", name: "Alex", isArchived: false },
      ],
    });

    expect(await screen.findByRole("heading", { name: "Main checking" })).toBeInTheDocument();
    const accountRow = screen.getByRole("heading", { name: "Main checking" }).closest("li")!;
    expect(within(accountRow).getByText("Checking")).toBeInTheDocument();
    expect(within(accountRow).getByText("USD")).toBeInTheDocument();
    expect(within(accountRow).getByText("Bank")).toBeInTheDocument();
    expect(within(accountRow).getByText("Travel")).toBeInTheDocument();
    expect(within(accountRow).getByText("Owner: Alex")).toBeInTheDocument();
    expect(within(accountRow).getByText("Joint account")).toBeInTheDocument();
  });

  it("creates an account with an opening balance", async () => {
    const user = userEvent.setup();
    const fake = renderAccounts({
      accounts: [account({ id: "account-1", name: "Cash", assetType: "cash" })],
    });
    await screen.findByRole("heading", { name: "Cash" });

    await user.click(screen.getByRole("button", { name: "New account" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("New account")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Account name"), "Savings");
    await user.selectOptions(within(dialog).getByLabelText("Type"), "savings");
    await user.type(within(dialog).getByLabelText("Opening balance"), "250.00");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(fake.state.masterData.accounts).toHaveLength(2));
    const created = fake.state.masterData.accounts[1]!;
    expect(created.name).toBe("Savings");
    expect(created.assetType).toBe("savings");
    expect(await screen.findByRole("heading", { name: "Savings" })).toBeInTheDocument();
  });

  it("archives an account and restores it from the archived list", async () => {
    const user = userEvent.setup();
    const fake = renderAccounts({
      accounts: [account({ id: "account-1", name: "Cash", assetType: "cash" })],
    });
    await screen.findByRole("heading", { name: "Cash" });

    await user.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(fake.state.masterData.accounts[0]?.isArchived).toBe(true));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Cash" })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByLabelText("Show archived"));
    expect(await screen.findByText("Archived")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(fake.state.masterData.accounts[0]?.isArchived).toBe(false));
  });

  it("rejects an empty account name", async () => {
    const user = userEvent.setup();
    const fake = renderAccounts({
      accounts: [account({ id: "account-1", name: "Cash", assetType: "cash" })],
    });
    await screen.findByRole("heading", { name: "Cash" });

    await user.click(screen.getByRole("button", { name: "New account" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(await within(dialog).findByText("Enter an account name.")).toBeInTheDocument();
    expect(fake.state.masterData.accounts).toHaveLength(1);
  });

  it("creates and archives an account group", async () => {
    const user = userEvent.setup();
    const fake = renderAccounts({
      accounts: [account({ id: "account-1", name: "Cash", assetType: "cash" })],
    });
    await screen.findByRole("heading", { name: "Cash" });

    const region = screen.getByRole("region", { name: "Account groups" });
    await user.click(within(region).getByRole("button", { name: "New group" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Group name"), "Bank");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(fake.state.masterData.accountGroups).toHaveLength(1));
    const updatedRegion = await screen.findByRole("region", { name: "Account groups" });
    expect(within(updatedRegion).getByText("Bank")).toBeInTheDocument();

    await user.click(within(updatedRegion).getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(fake.state.masterData.accountGroups[0]?.isArchived).toBe(true));
  });
});
