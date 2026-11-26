import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppProviders } from "../../app/providers";
import { routes } from "../../app/routes";
import { activeProfile, createFakeIpc, ledgerSummary, markUnavailable } from "../../test/fake-ipc";

function renderLedgers() {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  const business = markUnavailable(
    ledgerSummary({ id: "ledger-2", name: "Business" }),
    "missing_database",
  );
  const fake = createFakeIpc({
    ledgers: [household, business],
    activeLedgerId: household.id,
    profile: activeProfile({ id: household.id, name: "Household" }),
  });
  const router = createMemoryRouter(routes, { initialEntries: ["/ledgers"] });
  render(
    <AppProviders ipc={fake.ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return fake;
}

describe("the ledger manager", () => {
  it("explains an unavailable store", async () => {
    renderLedgers();

    expect(await screen.findByRole("heading", { name: "Business" })).toBeInTheDocument();
    expect(screen.getByText("The database file is missing.")).toBeInTheDocument();
    expect(screen.getByText("Store unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("reports a failed retry without changing the selection", async () => {
    const user = userEvent.setup();
    const fake = renderLedgers();
    await screen.findByRole("heading", { name: "Business" });

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The ledger could not be opened. The ledger database cannot be opened.",
    );
    expect(fake.state.activeLedgerId).toBe("ledger-1");
  });

  it("removes a ledger from this device after confirmation", async () => {
    const user = userEvent.setup();
    const fake = renderLedgers();
    await screen.findByRole("heading", { name: "Business" });

    const removeButtons = screen.getAllByRole("button", { name: "Remove from this device" });
    await user.click(removeButtons[1]!);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Remove this ledger from the device?")).toBeInTheDocument();
    expect(within(dialog).getByText(/its database and key files stay/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Removed Business from this device.")).toBeInTheDocument();
    expect(fake.state.ledgers.map((ledger) => ledger.name)).toEqual(["Household"]);
  });
});
