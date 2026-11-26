import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AppInfo } from "@bluewhale/ipc";
import { IpcError } from "@bluewhale/ipc";
import { AppProviders } from "./providers";
import { routes } from "./routes";
import type { IpcClient } from "../lib/ipc-context";

const info: AppInfo = { name: "Bluewhale", version: "0.1.0", os: "windows", arch: "x86_64" };

function renderApp(ipc: IpcClient, initialEntries: string[] = ["/"]) {
  const router = createMemoryRouter(routes, { initialEntries });
  return render(
    <AppProviders ipc={ipc} initialPreferences={{ language: "en", theme: "system" }}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe("the application shell", () => {
  it("shows the runtime metadata returned over IPC", async () => {
    renderApp({ appInfo: async () => info });

    expect(await screen.findByText("0.1.0")).toBeInTheDocument();
    expect(screen.getByText("windows / x86_64")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("navigates to settings and switches the interface language", async () => {
    const user = userEvent.setup();
    renderApp({ appInfo: async () => info });

    await user.click(screen.getByRole("link", { name: "Settings" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "简体中文" }));
    expect(await screen.findByRole("heading", { name: "设置" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-Hans");
  });

  it("applies the chosen appearance to the document", async () => {
    const user = userEvent.setup();
    renderApp({ appInfo: async () => info }, ["/settings"]);

    await user.click(await screen.findByRole("radio", { name: "Dark" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
  });

  it("surfaces an unavailable desktop runtime without crashing", async () => {
    const unavailable: IpcClient = {
      appInfo: async () => {
        throw new IpcError({
          code: "unavailable",
          message_key: "errors.unavailable",
          details: null,
        });
      },
    };
    renderApp(unavailable);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The desktop runtime is not available.",
    );
    expect(screen.getByText(/Open the application through pnpm dev/)).toBeInTheDocument();
  });

  it("shows the not-found page for an unknown route", async () => {
    renderApp({ appInfo: async () => info }, ["/missing"]);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
