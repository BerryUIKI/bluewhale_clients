import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { MasterDataDto } from "@bluewhale/ipc";
import { AppProviders } from "../../app/providers";
import { routes } from "../../app/routes";
import { activeProfile, createFakeIpc, emptyMasterData, ledgerSummary } from "../../test/fake-ipc";

const seed: MasterDataDto = {
  ...emptyMasterData(),
  categoryGroups: [{ id: "group-1", name: "Essentials", kind: "expense", isArchived: false }],
  categories: [
    {
      id: "category-1",
      name: "Groceries",
      kind: "expense",
      groupId: "group-1",
      isArchived: false,
    },
    {
      id: "category-2",
      name: "Salary",
      kind: "income",
      groupId: null,
      isArchived: false,
    },
  ],
};

function renderCategories(masterData: MasterDataDto = seed) {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  const fake = createFakeIpc({
    ledgers: [household],
    activeLedgerId: household.id,
    profile: activeProfile({ id: household.id, name: "Household" }),
    masterData,
  });
  const router = createMemoryRouter(routes, { initialEntries: ["/categories"] });
  render(
    <AppProviders ipc={fake.ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return fake;
}

describe("the categories page", () => {
  it("shows the two-level expense and income categories", async () => {
    renderCategories();

    expect(await screen.findByRole("heading", { name: "Expense categories" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Income categories" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Essentials" })).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Ungrouped")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
  });

  it("creates a category inside a group", async () => {
    const user = userEvent.setup();
    const fake = renderCategories();
    const section = await screen.findByRole("region", { name: "Expense categories" });

    await user.click(within(section).getByRole("button", { name: "New category" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Category name"), "Rent");
    await user.selectOptions(within(dialog).getByLabelText("Group"), "group-1");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(fake.state.masterData.categories).toHaveLength(3));
    const created = fake.state.masterData.categories[2]!;
    expect(created.name).toBe("Rent");
    expect(created.kind).toBe("expense");
    expect(created.groupId).toBe("group-1");
  });

  it("creates a category group of the section kind", async () => {
    const user = userEvent.setup();
    const fake = renderCategories();
    const section = await screen.findByRole("region", { name: "Income categories" });

    await user.click(within(section).getByRole("button", { name: "New group" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Group name"), "Earnings");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(fake.state.masterData.categoryGroups).toHaveLength(2));
    expect(fake.state.masterData.categoryGroups[1]?.kind).toBe("income");
    expect(await screen.findByRole("heading", { name: "Earnings" })).toBeInTheDocument();
  });

  it("archives a category and restores it from the archived list", async () => {
    const user = userEvent.setup();
    const fake = renderCategories();
    await screen.findByText("Groceries");

    const row = screen.getByText("Groceries").closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Archive" }));
    await waitFor(() =>
      expect(
        fake.state.masterData.categories.find((entry) => entry.id === "category-1")?.isArchived,
      ).toBe(true),
    );
    await waitFor(() => expect(screen.queryByText("Groceries")).not.toBeInTheDocument());

    await user.click(screen.getByLabelText("Show archived"));
    const archivedRow = (await screen.findByText("Groceries")).closest("li")!;
    await user.click(within(archivedRow).getByRole("button", { name: "Restore" }));
    await waitFor(() =>
      expect(
        fake.state.masterData.categories.find((entry) => entry.id === "category-1")?.isArchived,
      ).toBe(false),
    );
  });

  it("moves a category out of an archived group", async () => {
    const user = userEvent.setup();
    const archived = {
      ...seed,
      categoryGroups: [
        { id: "group-1", name: "Essentials", kind: "expense" as const, isArchived: true },
      ],
    };
    const fake = renderCategories(archived);
    await screen.findByText("Groceries");

    const row = screen.getByText("Groceries").closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("The current group is archived. Choose another group or no group."),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        fake.state.masterData.categories.find((entry) => entry.id === "category-1")?.groupId,
      ).toBeNull(),
    );
  });
});
