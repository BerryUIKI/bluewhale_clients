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
  tags: [
    {
      id: "tag-1",
      name: "Travel",
      colorHex: "#112233",
      description: "Trips",
      isArchived: false,
    },
  ],
};

function renderTags(masterData: MasterDataDto = seed) {
  const household = ledgerSummary({ id: "ledger-1", name: "Household", isActive: true });
  const fake = createFakeIpc({
    ledgers: [household],
    activeLedgerId: household.id,
    profile: activeProfile({ id: household.id, name: "Household" }),
    masterData,
  });
  const router = createMemoryRouter(routes, { initialEntries: ["/tags"] });
  render(
    <AppProviders ipc={fake.ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return fake;
}

describe("the tags page", () => {
  it("lists tags with their color and description", async () => {
    renderTags();

    expect(await screen.findByRole("heading", { name: "Travel" })).toBeInTheDocument();
    expect(screen.getByText("#112233")).toBeInTheDocument();
    expect(screen.getByText("Trips")).toBeInTheDocument();
  });

  it("creates a tag", async () => {
    const user = userEvent.setup();
    const fake = renderTags(emptyMasterData());

    await user.click(await screen.findByRole("button", { name: "New tag" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Tag name"), "Health");
    await user.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(fake.state.masterData.tags).toHaveLength(1));
    const created = fake.state.masterData.tags[0]!;
    expect(created.name).toBe("Health");
    expect(created.colorHex).toBe("#3B82F6");
    expect(await screen.findByRole("heading", { name: "Health" })).toBeInTheDocument();
  });

  it("edits a tag", async () => {
    const user = userEvent.setup();
    const fake = renderTags();
    await screen.findByRole("heading", { name: "Travel" });

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    const name = within(dialog).getByLabelText("Tag name");
    await user.clear(name);
    await user.type(name, "Trips");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fake.state.masterData.tags[0]?.name).toBe("Trips"));
    expect(fake.state.masterData.tags[0]?.isArchived).toBe(false);
    expect(await screen.findByRole("heading", { name: "Trips" })).toBeInTheDocument();
  });

  it("archives a tag and restores it from the archived list", async () => {
    const user = userEvent.setup();
    const fake = renderTags();
    await screen.findByRole("heading", { name: "Travel" });

    await user.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(fake.state.masterData.tags[0]?.isArchived).toBe(true));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Travel" })).not.toBeInTheDocument(),
    );

    await user.click(screen.getByLabelText("Show archived"));
    expect(await screen.findByRole("heading", { name: "Travel" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(fake.state.masterData.tags[0]?.isArchived).toBe(false));
  });
});
