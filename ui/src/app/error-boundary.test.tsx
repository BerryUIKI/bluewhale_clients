import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AppInfo } from "@bluewhale/ipc";
import { AppErrorBoundary } from "./error-boundary";
import { AppProviders } from "./providers";

const info: AppInfo = { name: "Bluewhale", version: "0.1.0", os: "windows", arch: "x86_64" };

function Bomb(): never {
  throw new Error("render failure");
}

describe("the error boundary", () => {
  it("shows the localized recovery screen when a screen fails", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <AppProviders
        ipc={{ appInfo: async () => info }}
        initialPreferences={{ language: "en", theme: "system" }}
      >
        <AppErrorBoundary>
          <Bomb />
        </AppErrorBoundary>
      </AppProviders>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("The interface stopped unexpectedly");
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
