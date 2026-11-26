import { IpcError } from "@bluewhale/ipc";
import type { ErrorCode } from "@bluewhale/ipc";
import { describe, expect, it } from "vitest";
import { errorMessageKey, isUnavailable } from "./errors";

const CODES: ErrorCode[] = [
  "conflict",
  "forbidden",
  "internal",
  "invalid_request",
  "not_found",
  "unavailable",
];

function ipcError(code: ErrorCode): IpcError {
  return new IpcError({ code, message_key: `errors.${code}`, details: null });
}

describe("command error mapping", () => {
  it.each(CODES)("maps %s to its localized message", (code) => {
    expect(errorMessageKey(ipcError(code))).toBe(`errors.${code}`);
  });

  it("maps unknown failures to the internal message", () => {
    expect(errorMessageKey(new Error("raw detail"))).toBe("errors.internal");
    expect(errorMessageKey("raw detail")).toBe("errors.internal");
    expect(errorMessageKey(undefined)).toBe("errors.internal");
  });

  it("recognizes an unavailable desktop runtime", () => {
    expect(isUnavailable(ipcError("unavailable"))).toBe(true);
    expect(isUnavailable(ipcError("internal"))).toBe(false);
    expect(isUnavailable(new Error("boom"))).toBe(false);
  });
});
