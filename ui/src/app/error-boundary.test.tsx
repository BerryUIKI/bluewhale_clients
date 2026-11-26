import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./error-boundary";
import { AppProviders } from "./providers";
import { createFakeIpc } from "../test/fake-ipc";

function Bomb(): never {
  throw new Error("render failure");
}

describe("the error boundary", () => {
  it("shows the localized recovery screen when a screen fails", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <AppProviders
        ipc={createFakeIpc().ipc}
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
