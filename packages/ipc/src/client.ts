import { isTauri } from "@tauri-apps/api/core";
import { commands } from "./bindings";
import type { AppInfo, CommandError, CommandErrorDetail, ErrorCode } from "./bindings";

export type { AppInfo, CommandError, CommandErrorDetail, ErrorCode };

/** The shape a command binding resolves to in result mode. */
export type CommandResult<T, E> = { status: "ok"; data: T } | { status: "error"; error: E };

/** A failed command with a stable code and a localization key. */
export class IpcError extends Error {
  readonly code: ErrorCode;
  readonly messageKey: string;
  readonly details: ReadonlyArray<CommandErrorDetail>;

  constructor(error: CommandError) {
    super(error.message_key);
    this.name = "IpcError";
    this.code = error.code;
    this.messageKey = error.message_key;
    this.details = error.details ?? [];
  }
}

/** Returns whether a value is an IPC command failure. */
export function isIpcError(value: unknown): value is IpcError {
  return value instanceof IpcError;
}

/** Unwraps a command result, throwing the typed error on failure. */
export function unwrapResult<T>(result: CommandResult<T, CommandError>): T {
  if (result.status === "ok") {
    return result.data;
  }
  throw new IpcError(result.error);
}

/** Returns build and platform information for this application. */
export async function appInfo(): Promise<AppInfo> {
  try {
    return unwrapResult(await commands.appInfo());
  } catch (error) {
    if (error instanceof IpcError) {
      throw error;
    }
    // A framework failure means the command never ran. Outside the desktop
    // shell that is the expected state; inside it, it is an internal fault.
    if (!isTauri()) {
      throw new IpcError({
        code: "unavailable",
        message_key: "errors.unavailable",
        details: null,
      });
    }
    throw new IpcError({ code: "internal", message_key: "errors.internal", details: null });
  }
}
