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
  counterparties: [
    {
      id: "counterparty-1",
      kind: "household_member",
      name: "Alex",
      isArchived: false,
    },
  ],
};

function renderCounterparties(masterData: MasterDataDto = seed) {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  const fake = createFakeIpc({
    ledgers: [household],
    activeLedgerId: household.id,
    profile: activeProfile({ id: household.id, name: "Household" }),
    masterData,
  });
  const router = createMemoryRouter(routes, { initialEntries: ["/counterparties"] });
  render(
    <AppProviders ipc={fake.ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return fake;
}

describe("the counterparties page", () => {
  it("lists counterparties with their kind", async () => {
    renderCounterparties();

    expect(await screen.findByRole("heading", { name: "Alex" })).toBeInTheDocument();
    expect(screen.getByText("Household member")).toBeInTheDocument();
  });

  it("creates a counterparty with the chosen kind", async () => {
    const user = userEvent.setup();
    const fake = renderCounterparties(emptyMasterData());

    await user.click(await screen.findByRole("button", { name: "New counterparty" }));
    const dialog = await screen.findByRole("dialog");
    await user.selectOptions(within(dialog).getByLabelText("Kind"), "organization");
    await user.type(within(dialog).getByLabelText("Name"), "Acme");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(fake.state.masterData.counterparties).toHaveLength(1));
    const created = fake.state.masterData.counterparties[0]!;
    expect(created.name).toBe("Acme");
    expect(created.kind).toBe("organization");
    expect(await screen.findByRole("heading", { name: "Acme" })).toBeInTheDocument();
  });

  it("archives a counterparty and restores it", async () => {
    const user = userEvent.setup();
    const fake = renderCounterparties();
    await screen.findByRole("heading", { name: "Alex" });

    await user.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(fake.state.masterData.counterparties[0]?.isArchived).toBe(true));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Alex" })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByLabelText("Show archived"));
    expect(await screen.findByRole("heading", { name: "Alex" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(fake.state.masterData.counterparties[0]?.isArchived).toBe(false));
  });
});
