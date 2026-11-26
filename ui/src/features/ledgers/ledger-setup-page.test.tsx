import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { IpcError } from "@bluewhale/ipc";
import { AppProviders } from "../../app/providers";
import { routes } from "../../app/routes";
import type { IpcClient } from "../../lib/ipc-context";
import { createFakeIpc } from "../../test/fake-ipc";

function renderAt(ipc: IpcClient, initialEntries: string[]) {
  const router = createMemoryRouter(routes, { initialEntries });
  return render(
    <AppProviders ipc={ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe("first-run setup", () => {
  it("redirects an empty catalog to the setup form", async () => {
    const fake = createFakeIpc();
    renderAt(fake.ipc, ["/"]);

    expect(await screen.findByRole("heading", { name: "Set up your ledger" })).toBeInTheDocument();
  });

  it("validates the name before creating", async () => {
    const user = userEvent.setup();
    const fake = createFakeIpc();
    renderAt(fake.ipc, ["/setup"]);
    await screen.findByRole("heading", { name: "Set up your ledger" });

    await user.click(screen.getByRole("button", { name: "Create ledger" }));

    expect(await screen.findByText("Enter a ledger name.")).toBeInTheDocument();
    expect(fake.state.ledgers).toHaveLength(0);
  });

  it("creates a ledger and opens the overview", async () => {
    const user = userEvent.setup();
    const fake = createFakeIpc();
    renderAt(fake.ipc, ["/setup"]);
    await screen.findByRole("heading", { name: "Set up your ledger" });

    await user.type(screen.getByLabelText("Ledger name"), "Household");
    await user.click(screen.getByRole("button", { name: "Create ledger" }));

    expect(await screen.findByRole("heading", { name: "Household" })).toBeInTheDocument();
    expect(fake.state.ledgers).toHaveLength(1);
    expect(fake.state.profile?.currencyCode).toBe("USD");
  });

  it("shows a command error from the runtime", async () => {
    const user = userEvent.setup();
    const fake = createFakeIpc();
    fake.state.createError = new IpcError({
      code: "invalid_request",
      messageKey: "errors.ledger_name",
      details: null,
    });
    renderAt(fake.ipc, ["/setup"]);
    await screen.findByRole("heading", { name: "Set up your ledger" });

    await user.type(screen.getByLabelText("Ledger name"), "Household");
    await user.click(screen.getByRole("button", { name: "Create ledger" }));

    expect(await screen.findByText("Enter a valid ledger name.")).toBeInTheDocument();
  });
});
