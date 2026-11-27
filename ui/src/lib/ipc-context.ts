import { createContext, useContext } from "react";
import type {
  AccountCreateRequestDto,
  AccountDto,
  AccountGroupCreateRequestDto,
  AccountGroupDto,
  AccountGroupUpdateRequestDto,
  AccountUpdateRequestDto,
  ActiveLedgerProfileDto,
  AppInfo,
  CategoryCreateRequestDto,
  CategoryDto,
  CategoryGroupCreateRequestDto,
  CategoryGroupDto,
  CategoryGroupUpdateRequestDto,
  CategoryUpdateRequestDto,
  CounterpartyCreateRequestDto,
  CounterpartyDto,
  CounterpartyUpdateRequestDto,
  CreateLedgerRequestDto,
  LedgerListDto,
  LedgerSummaryDto,
  MasterDataDto,
  RemovedLedgerDto,
  TagCreateRequestDto,
  TagDto,
  TagUpdateRequestDto,
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
  /** Returns every master-data record of the open ledger. */
  masterData(): Promise<MasterDataDto>;
  /** Creates an account and its optional opening balance. */
  accountCreate(request: AccountCreateRequestDto): Promise<AccountDto>;
  /** Updates an account without changing its currency. */
  accountUpdate(request: AccountUpdateRequestDto): Promise<AccountDto>;
  /** Creates an account group. */
  accountGroupCreate(request: AccountGroupCreateRequestDto): Promise<AccountGroupDto>;
  /** Updates an account group. */
  accountGroupUpdate(request: AccountGroupUpdateRequestDto): Promise<AccountGroupDto>;
  /** Creates a category group. */
  categoryGroupCreate(request: CategoryGroupCreateRequestDto): Promise<CategoryGroupDto>;
  /** Updates a category group. */
  categoryGroupUpdate(request: CategoryGroupUpdateRequestDto): Promise<CategoryGroupDto>;
  /** Creates a leaf category. */
  categoryCreate(request: CategoryCreateRequestDto): Promise<CategoryDto>;
  /** Updates a leaf category. */
  categoryUpdate(request: CategoryUpdateRequestDto): Promise<CategoryDto>;
  /** Creates a tag. */
  tagCreate(request: TagCreateRequestDto): Promise<TagDto>;
  /** Updates a tag. */
  tagUpdate(request: TagUpdateRequestDto): Promise<TagDto>;
  /** Creates a counterparty. */
  counterpartyCreate(request: CounterpartyCreateRequestDto): Promise<CounterpartyDto>;
  /** Updates a counterparty. */
  counterpartyUpdate(request: CounterpartyUpdateRequestDto): Promise<CounterpartyDto>;
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
