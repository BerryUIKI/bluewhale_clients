import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { IpcError } from "@bluewhale/ipc";
import { AppProviders } from "./providers";
import { routes } from "./routes";
import type { IpcClient } from "../lib/ipc-context";
import { activeProfile, createFakeIpc, ledgerSummary } from "../test/fake-ipc";

function renderApp(ipc: IpcClient, initialEntries: string[] = ["/"]) {
  const router = createMemoryRouter(routes, { initialEntries });
  return render(
    <AppProviders ipc={ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

function householdFake() {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  return createFakeIpc({
    ledgers: [household],
    activeLedgerId: household.id,
    profile: activeProfile({
      id: household.id,
      name: "Household",
      currencyCode: "CNY",
      timeZoneIdentifier: "Asia/Shanghai",
    }),
  });
}

describe("the application shell", () => {
  it("shows the active ledger profile", async () => {
    const fake = householdFake();
    renderApp(fake.ipc);

    expect(await screen.findByRole("heading", { name: "Household" })).toBeInTheDocument();
    expect(screen.getByText("CNY")).toBeInTheDocument();
    expect(screen.getByText("Asia/Shanghai")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("switches the active ledger from the shell", async () => {
    const user = userEvent.setup();
    const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
    const business = ledgerSummary({ id: "ledger-2", name: "Business" });
    const fake = createFakeIpc({
      ledgers: [household, business],
      activeLedgerId: household.id,
      profile: activeProfile({ id: household.id, name: "Household" }),
    });
    renderApp(fake.ipc);

    await screen.findByRole("heading", { name: "Household" });
    const select = screen.getByLabelText("Ledger");
    await user.selectOptions(select, "ledger-2");

    expect(await screen.findByRole("heading", { name: "Business" })).toBeInTheDocument();
    expect(fake.state.activeLedgerId).toBe("ledger-2");
  });

  it("navigates to settings and switches the interface language", async () => {
    const user = userEvent.setup();
    const fake = householdFake();
    renderApp(fake.ipc);
    await screen.findByRole("heading", { name: "Household" });

    await user.click(screen.getByRole("link", { name: "Settings" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "简体中文" }));
    expect(await screen.findByRole("heading", { name: "设置" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-Hans");
  });

  it("applies the chosen appearance to the document", async () => {
    const user = userEvent.setup();
    renderApp(householdFake().ipc, ["/settings"]);

    await user.click(await screen.findByRole("radio", { name: "Dark" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  });

  it("surfaces an unavailable desktop runtime without crashing", async () => {
    const fake = createFakeIpc();
    fake.ipc.ledgerList = async () => {
      throw new IpcError({ code: "unavailable", messageKey: "errors.unavailable", details: null });
    };
    renderApp(fake.ipc);

    expect(
      await screen.findByRole("heading", { name: "The ledger list is unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The desktop runtime is not available.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows the not-found page for an unknown route", async () => {
    renderApp(householdFake().ipc, ["/missing"]);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
