import { IpcError } from "@bluewhale/ipc";
import type {
  ActiveLedgerProfileDto,
  AppInfo,
  CreateLedgerRequestDto,
  LedgerListDto,
  LedgerStatusDto,
  LedgerSummaryDto,
  LedgerUnavailableDto,
  RemovedLedgerDto,
} from "@bluewhale/ipc";
import type { IpcClient } from "../lib/ipc-context";

const INFO: AppInfo = { name: "Bluewhale", version: "0.1.0", os: "windows", arch: "x86_64" };

export interface FakeState {
  info: AppInfo;
  ledgers: LedgerSummaryDto[];
  activeLedgerId: string | null;
  profile: ActiveLedgerProfileDto | null;
  createError: Error | null;
}

export interface FakeIpc {
  ipc: IpcClient;
  state: FakeState;
}

/** Builds a ledger summary with sensible defaults for tests. */
export function ledgerSummary(
  overrides: Partial<LedgerSummaryDto> & { id: string; name: string },
): LedgerSummaryDto {
  return {
    emoji: "🐳",
    createdAt: "2026-11-26T00:00:00.000Z",
    isActive: false,
    status: "available",
    unavailableReason: null,
    dataPath: `C:/data/ledgers/${overrides.id}`,
    ...overrides,
  };
}

/** Builds a profile for the active ledger. */
export function activeProfile(
  overrides: Partial<ActiveLedgerProfileDto> & { id: string; name: string },
): ActiveLedgerProfileDto {
  return {
    emoji: "🐳",
    currencyCode: "USD",
    timeZoneIdentifier: "UTC",
    ...overrides,
  };
}

/** An in-memory IPC client for the interface tests. */
export function createFakeIpc(initial?: Partial<FakeState>): FakeIpc {
  const state: FakeState = {
    info: INFO,
    ledgers: [],
    activeLedgerId: null,
    profile: null,
    createError: null,
    ...initial,
  };

  const ipc: IpcClient = {
    appInfo: async () => state.info,
    ledgerList: async (): Promise<LedgerListDto> => ({
      activeLedgerId: state.activeLedgerId,
      ledgers: state.ledgers.map((ledger) => ({ ...ledger })),
    }),
    ledgerActiveProfile: async () => state.profile,
    ledgerCreate: async (request: CreateLedgerRequestDto) => {
      if (state.createError) {
        throw state.createError;
      }
      const id = `ledger-${state.ledgers.length + 1}`;
      const summary = ledgerSummary({
        id,
        name: request.name,
        emoji: request.emoji,
        isActive: true,
      });
      state.ledgers = state.ledgers.map((ledger) => ({ ...ledger, isActive: false }));
      state.ledgers.push(summary);
      state.activeLedgerId = id;
      state.profile = activeProfile({
        id,
        name: request.name,
        emoji: request.emoji,
        currencyCode: request.currencyCode,
        timeZoneIdentifier: request.timeZoneIdentifier,
      });
      return summary;
    },
    ledgerSwitch: async (ledgerId: string) => {
      const target = state.ledgers.find((ledger) => ledger.id === ledgerId);
      if (!target) {
        throw new IpcError({
          code: "not_found",
          messageKey: "errors.ledger_not_found",
          details: null,
        });
      }
      if (target.status === "unavailable") {
        throw new IpcError({
          code: "unavailable",
          messageKey: "errors.ledger_database_unreadable",
          details: null,
        });
      }
      state.ledgers = state.ledgers.map((ledger) => ({
        ...ledger,
        isActive: ledger.id === ledgerId,
      }));
      state.activeLedgerId = ledgerId;
      state.profile = activeProfile({ id: target.id, name: target.name, emoji: target.emoji });
      return { ...target, isActive: true };
    },
    ledgerRemove: async (ledgerId: string): Promise<RemovedLedgerDto> => {
      const target = state.ledgers.find((ledger) => ledger.id === ledgerId);
      state.ledgers = state.ledgers.filter((ledger) => ledger.id !== ledgerId);
      if (state.activeLedgerId === ledgerId) {
        state.activeLedgerId = null;
        state.profile = null;
      }
      return { id: ledgerId, dataPath: target?.dataPath ?? "" };
    },
  };

  return { ipc, state };
}

/** Marks a ledger unavailable in a fake state. */
export function markUnavailable(
  summary: LedgerSummaryDto,
  reason: LedgerUnavailableDto,
): LedgerSummaryDto {
  const status: LedgerStatusDto = "unavailable";
  return { ...summary, status, unavailableReason: reason };
}
