import { IpcError } from "@bluewhale/ipc";
import type { ErrorCode } from "@bluewhale/ipc";
import { describe, expect, it } from "vitest";
import { errorMessageKey, errorPath, isUnavailable } from "./errors";

const CODES: ErrorCode[] = [
  "conflict",
  "forbidden",
  "internal",
  "invalid_request",
  "not_found",
  "unavailable",
];

function ipcError(code: ErrorCode, messageKey = `errors.${code}`): IpcError {
  return new IpcError({ code, messageKey, details: null });
}

describe("command error mapping", () => {
  it.each(CODES)("maps %s to its localized message", (code) => {
    expect(errorMessageKey(ipcError(code))).toBe(`errors.${code}`);
  });

  it("prefers a known specific message key", () => {
    expect(errorMessageKey(ipcError("unavailable", "errors.ledger_missing_key"))).toBe(
      "errors.ledger_missing_key",
    );
    expect(errorMessageKey(ipcError("invalid_request", "errors.ledger_name"))).toBe(
      "errors.ledger_name",
    );
  });

  it("ignores unknown message keys and falls back to the code", () => {
    expect(errorMessageKey(ipcError("invalid_request", "errors.unknown_key"))).toBe(
      "errors.invalid_request",
    );
  });

  it("maps unknown failures to the internal message", () => {
    expect(errorMessageKey(new Error("raw detail"))).toBe("errors.internal");
    expect(errorMessageKey("raw detail")).toBe("errors.internal");
    expect(errorMessageKey(undefined)).toBe("errors.internal");
  });

  it("extracts a literal path from the details", () => {
    const withPath = new IpcError({
      code: "unavailable",
      messageKey: "errors.ledger_missing_database",
      details: [
        {
          field: "path",
          messageKey: "errors.path",
          value: "C:/data/ledgers/abc/ledger.db",
        },
      ],
    });
    expect(errorPath(withPath)).toBe("C:/data/ledgers/abc/ledger.db");
    expect(errorPath(ipcError("internal"))).toBeNull();
    expect(errorPath(new Error("boom"))).toBeNull();
  });

  it("recognizes an unavailable desktop runtime", () => {
    expect(isUnavailable(ipcError("unavailable"))).toBe(true);
    expect(isUnavailable(ipcError("internal"))).toBe(false);
    expect(isUnavailable(new Error("boom"))).toBe(false);
  });
});
