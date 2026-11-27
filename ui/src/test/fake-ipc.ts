import { IpcError } from "@bluewhale/ipc";
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
  LedgerStatusDto,
  LedgerSummaryDto,
  LedgerUnavailableDto,
  MasterDataDto,
  RemovedLedgerDto,
  TagCreateRequestDto,
  TagDto,
  TagUpdateRequestDto,
} from "@bluewhale/ipc";
import type { IpcClient } from "../lib/ipc-context";

const INFO: AppInfo = { name: "Bluewhale", version: "0.1.0", os: "windows", arch: "x86_64" };

export interface FakeState {
  info: AppInfo;
  ledgers: LedgerSummaryDto[];
  activeLedgerId: string | null;
  profile: ActiveLedgerProfileDto | null;
  createError: Error | null;
  masterData: MasterDataDto;
  masterDataError: Error | null;
}

export interface FakeIpc {
  ipc: IpcClient;
  state: FakeState;
}

/** Returns an empty master-data snapshot. */
export function emptyMasterData(): MasterDataDto {
  return {
    accounts: [],
    accountGroups: [],
    categoryGroups: [],
    categories: [],
    tags: [],
    counterparties: [],
  };
}

function copyMasterData(data: MasterDataDto): MasterDataDto {
  return {
    accounts: data.accounts.map((account) => ({ ...account, tagIds: [...account.tagIds] })),
    accountGroups: data.accountGroups.map((group) => ({ ...group })),
    categoryGroups: data.categoryGroups.map((group) => ({ ...group })),
    categories: data.categories.map((category) => ({ ...category })),
    tags: data.tags.map((tag) => ({ ...tag })),
    counterparties: data.counterparties.map((counterparty) => ({ ...counterparty })),
  };
}

function notFound(): IpcError {
  return new IpcError({
    code: "not_found",
    messageKey: "errors.master_data_not_found",
    details: null,
  });
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
    masterData: emptyMasterData(),
    masterDataError: null,
    ...initial,
  };

  const requireLedger = () => {
    if (state.profile === null) {
      throw new IpcError({
        code: "unavailable",
        messageKey: "errors.master_data_no_ledger",
        details: null,
      });
    }
  };

  const replaceAccount = (account: AccountDto) => {
    state.masterData = {
      ...state.masterData,
      accounts: state.masterData.accounts.map((entry) =>
        entry.id === account.id ? account : entry,
      ),
    };
    return account;
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
    masterData: async () => {
      if (state.masterDataError) {
        throw state.masterDataError;
      }
      requireLedger();
      return copyMasterData(state.masterData);
    },
    accountCreate: async (request: AccountCreateRequestDto) => {
      requireLedger();
      const account: AccountDto = {
        id: `account-${state.masterData.accounts.length + 1}`,
        name: request.name.trim(),
        assetType: request.assetType,
        currencyCode: request.currencyCode,
        tagIds: [...request.tagIds],
        ownerId: request.ownerId ?? null,
        customGroupId: request.customGroupId ?? null,
        note: request.note.trim(),
        isHidden: request.isHidden,
        isIncludedInNetWorth: request.isIncludedInNetWorth,
        isArchived: false,
      };
      state.masterData = {
        ...state.masterData,
        accounts: [...state.masterData.accounts, account],
      };
      return account;
    },
    accountUpdate: async (request: AccountUpdateRequestDto) => {
      requireLedger();
      const existing = state.masterData.accounts.find((entry) => entry.id === request.id);
      if (!existing) {
        throw notFound();
      }
      return replaceAccount({
        ...existing,
        name: request.name.trim(),
        assetType: request.assetType,
        tagIds: [...request.tagIds],
        ownerId: request.ownerId ?? null,
        customGroupId: request.customGroupId ?? null,
        note: request.note.trim(),
        isHidden: request.isHidden,
        isIncludedInNetWorth: request.isIncludedInNetWorth,
        isArchived: request.isArchived,
      });
    },
    accountGroupCreate: async (request: AccountGroupCreateRequestDto) => {
      requireLedger();
      const group: AccountGroupDto = {
        id: `account-group-${state.masterData.accountGroups.length + 1}`,
        name: request.name.trim(),
        isArchived: false,
      };
      state.masterData = {
        ...state.masterData,
        accountGroups: [...state.masterData.accountGroups, group],
      };
      return group;
    },
    accountGroupUpdate: async (request: AccountGroupUpdateRequestDto) => {
      requireLedger();
      const existing = state.masterData.accountGroups.find((entry) => entry.id === request.id);
      if (!existing) {
        throw notFound();
      }
      const group: AccountGroupDto = {
        ...existing,
        name: request.name.trim(),
        isArchived: request.isArchived,
      };
      state.masterData = {
        ...state.masterData,
        accountGroups: state.masterData.accountGroups.map((entry) =>
          entry.id === group.id ? group : entry,
        ),
      };
      return group;
    },
    categoryGroupCreate: async (request: CategoryGroupCreateRequestDto) => {
      requireLedger();
      const group: CategoryGroupDto = {
        id: `category-group-${state.masterData.categoryGroups.length + 1}`,
        name: request.name.trim(),
        kind: request.kind,
        isArchived: false,
      };
      state.masterData = {
        ...state.masterData,
        categoryGroups: [...state.masterData.categoryGroups, group],
      };
      return group;
    },
    categoryGroupUpdate: async (request: CategoryGroupUpdateRequestDto) => {
      requireLedger();
      const existing = state.masterData.categoryGroups.find((entry) => entry.id === request.id);
      if (!existing) {
        throw notFound();
      }
      const group: CategoryGroupDto = {
        ...existing,
        name: request.name.trim(),
        isArchived: request.isArchived,
      };
      state.masterData = {
        ...state.masterData,
        categoryGroups: state.masterData.categoryGroups.map((entry) =>
          entry.id === group.id ? group : entry,
        ),
      };
      return group;
    },
    categoryCreate: async (request: CategoryCreateRequestDto) => {
      requireLedger();
      const category: CategoryDto = {
        id: `category-${state.masterData.categories.length + 1}`,
        name: request.name.trim(),
        kind: request.kind,
        groupId: request.groupId ?? null,
        isArchived: false,
      };
      state.masterData = {
        ...state.masterData,
        categories: [...state.masterData.categories, category],
      };
      return category;
    },
    categoryUpdate: async (request: CategoryUpdateRequestDto) => {
      requireLedger();
      const existing = state.masterData.categories.find((entry) => entry.id === request.id);
      if (!existing) {
        throw notFound();
      }
      const category: CategoryDto = {
        ...existing,
        name: request.name.trim(),
        groupId: request.groupId ?? null,
        isArchived: request.isArchived,
      };
      state.masterData = {
        ...state.masterData,
        categories: state.masterData.categories.map((entry) =>
          entry.id === category.id ? category : entry,
        ),
      };
      return category;
    },
    tagCreate: async (request: TagCreateRequestDto) => {
      requireLedger();
      const tag: TagDto = {
        id: `tag-${state.masterData.tags.length + 1}`,
        name: request.name.trim(),
        colorHex: request.colorHex.toUpperCase(),
        description: request.description?.trim() || null,
        isArchived: false,
      };
      state.masterData = { ...state.masterData, tags: [...state.masterData.tags, tag] };
      return tag;
    },
    tagUpdate: async (request: TagUpdateRequestDto) => {
      requireLedger();
      const existing = state.masterData.tags.find((entry) => entry.id === request.id);
      if (!existing) {
        throw notFound();
      }
      const tag: TagDto = {
        ...existing,
        name: request.name.trim(),
        colorHex: request.colorHex.toUpperCase(),
        description: request.description?.trim() || null,
        isArchived: request.isArchived,
      };
      state.masterData = {
        ...state.masterData,
        tags: state.masterData.tags.map((entry) => (entry.id === tag.id ? tag : entry)),
      };
      return tag;
    },
    counterpartyCreate: async (request: CounterpartyCreateRequestDto) => {
      requireLedger();
      const counterparty: CounterpartyDto = {
        id: `counterparty-${state.masterData.counterparties.length + 1}`,
        kind: request.kind,
        name: request.name.trim(),
        isArchived: false,
      };
      state.masterData = {
        ...state.masterData,
        counterparties: [...state.masterData.counterparties, counterparty],
      };
      return counterparty;
    },
    counterpartyUpdate: async (request: CounterpartyUpdateRequestDto) => {
      requireLedger();
      const existing = state.masterData.counterparties.find((entry) => entry.id === request.id);
      if (!existing) {
        throw notFound();
      }
      const counterparty: CounterpartyDto = {
        ...existing,
        kind: request.kind,
        name: request.name.trim(),
        isArchived: request.isArchived,
      };
      state.masterData = {
        ...state.masterData,
        counterparties: state.masterData.counterparties.map((entry) =>
          entry.id === counterparty.id ? counterparty : entry,
        ),
      };
      return counterparty;
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
