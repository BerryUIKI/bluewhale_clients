import { isTauri } from "@tauri-apps/api/core";
import { commands } from "./bindings";
import type {
  ActiveLedgerProfileDto,
  AppInfo,
  CommandError,
  CommandErrorDetail,
  CreateLedgerRequestDto,
  ErrorCode,
  LedgerListDto,
  LedgerSummaryDto,
  RemovedLedgerDto,
} from "./bindings";

export type {
  ActiveLedgerProfileDto,
  AppInfo,
  CommandError,
  CommandErrorDetail,
  CreateLedgerRequestDto,
  ErrorCode,
  LedgerListDto,
  LedgerStatusDto,
  LedgerSummaryDto,
  LedgerUnavailableDto,
  RemovedLedgerDto,
} from "./bindings";

/** The shape a command binding resolves to in result mode. */
export type CommandResult<T, E> = { status: "ok"; data: T } | { status: "error"; error: E };

/** A failed command with a stable code and a localization key. */
export class IpcError extends Error {
  readonly code: ErrorCode;
  readonly messageKey: string;
  readonly details: ReadonlyArray<CommandErrorDetail>;

  constructor(error: CommandError) {
    super(error.messageKey);
    this.name = "IpcError";
    this.code = error.code;
    this.messageKey = error.messageKey;
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

function normalizeError(error: unknown): IpcError {
  if (error instanceof IpcError) {
    return error;
  }
  // A framework failure means the command never ran. Outside the desktop
  // shell that is the expected state; inside it, it is an internal fault.
  if (!isTauri()) {
    return new IpcError({
      code: "unavailable",
      messageKey: "errors.unavailable",
      details: null,
    });
  }
  return new IpcError({ code: "internal", messageKey: "errors.internal", details: null });
}

async function call<T>(operation: () => Promise<CommandResult<T, CommandError>>): Promise<T> {
  try {
    return unwrapResult(await operation());
  } catch (error) {
    throw normalizeError(error);
  }
}

/** Returns build and platform information for this application. */
export function appInfo(): Promise<AppInfo> {
  return call(() => commands.appInfo());
}

/** Returns the ledger selector data. */
export function ledgerList(): Promise<LedgerListDto> {
  return call(() => commands.ledgerList());
}

/** Creates a ledger, initializes its database, and selects it. */
export function ledgerCreate(request: CreateLedgerRequestDto): Promise<LedgerSummaryDto> {
  return call(() => commands.ledgerCreate(request));
}

/** Opens and selects a ledger. */
export function ledgerSwitch(ledgerId: string): Promise<LedgerSummaryDto> {
  return call(() => commands.ledgerSwitch(ledgerId));
}

/** Removes a ledger from this device without deleting its files. */
export function ledgerRemove(ledgerId: string): Promise<RemovedLedgerDto> {
  return call(() => commands.ledgerRemove(ledgerId));
}

/** Returns the profile of the open ledger, if any. */
export function ledgerActiveProfile(): Promise<ActiveLedgerProfileDto | null> {
  return call(() => commands.ledgerActiveProfile());
}
