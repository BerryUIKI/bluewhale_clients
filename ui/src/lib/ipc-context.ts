import { createContext, useContext } from "react";
import type {
  ActiveLedgerProfileDto,
  AppInfo,
  CreateLedgerRequestDto,
  LedgerListDto,
  LedgerSummaryDto,
  RemovedLedgerDto,
} from "@bluewhale/ipc";

/** The subset of the IPC surface the interface depends on. */
export interface IpcClient {
  /** Returns build and platform information for this application. */
  appInfo(): Promise<AppInfo>;
  /** Returns the ledger selector data. */
  ledgerList(): Promise<LedgerListDto>;
  /** Creates a ledger and selects it. */
  ledgerCreate(request: CreateLedgerRequestDto): Promise<LedgerSummaryDto>;
  /** Opens and selects a ledger. */
  ledgerSwitch(ledgerId: string): Promise<LedgerSummaryDto>;
  /** Removes a ledger from this device without deleting its files. */
  ledgerRemove(ledgerId: string): Promise<RemovedLedgerDto>;
  /** Returns the profile of the open ledger, if any. */
  ledgerActiveProfile(): Promise<ActiveLedgerProfileDto | null>;
}

/** The injection point for the IPC client. */
export const IpcContext = createContext<IpcClient | null>(null);

/** Returns the IPC client. */
export function useIpc(): IpcClient {
  const client = useContext(IpcContext);
  if (client === null) {
    throw new Error("IpcProvider is missing");
  }
  return client;
}
