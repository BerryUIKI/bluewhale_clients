import { IpcError, appInfo, unwrapResult } from "@bluewhale/ipc";
import type { AppInfo } from "@bluewhale/ipc";
import { describe, expect, it } from "vitest";

const info: AppInfo = { name: "Bluewhale", version: "0.1.0", os: "windows", arch: "x86_64" };

describe("the IPC client", () => {
  it("unwraps a successful command result", () => {
    expect(unwrapResult({ status: "ok", data: info })).toEqual(info);
  });

  it("throws a typed error for a failed command", () => {
    expect(() =>
      unwrapResult({
        status: "error",
        error: { code: "conflict", message_key: "errors.conflict", details: null },
      }),
    ).toThrow(IpcError);
  });

  it("reports an unavailable runtime outside the desktop application", async () => {
    await expect(appInfo()).rejects.toMatchObject({ code: "unavailable" });
  });
});
