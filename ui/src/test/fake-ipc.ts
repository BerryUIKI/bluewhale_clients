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
  CategoryRankingDto,
  CategoryRankingRequestDto,
  DashboardDto,
  DashboardRequestDto,
  LedgerListDto,
  LedgerStatusDto,
  LedgerSummaryDto,
  LedgerUnavailableDto,
  MasterDataDto,
  MoneyDto,
  RemovedLedgerDto,
  TagCreateRequestDto,
  TagDto,
  TagUpdateRequestDto,
  TransactionCreateRequestDto,
  TransactionDto,
  TransactionListDto,
  TransactionQueryRequestDto,
  TransactionUpdateRequestDto,
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
  transactions: TransactionDto[];
  transactionError: Error | null;
  dashboard: DashboardDto | null;
  dashboardError: Error | null;
  categoryRanking: CategoryRankingDto | null;
  rankingError: Error | null;
  lastDashboardMonth: string | null;
  lastRankingMonth: string | null;
  lastRankingKind: string | null;
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

/** Returns an exact money DTO for tests. */
export function money(text: string, currencyCode = "CNY", scale = 2): MoneyDto {
  return { text, currencyCode, scale };
}

/** Builds a complete dashboard payload for tests. */
export function dashboardData(overrides: Partial<DashboardDto> = {}): DashboardDto {
  const zero = money("0.00");
  return {
    month: "2026-11",
    reportingCurrency: "CNY",
    availableCurrencies: ["CNY"],
    accountBalances: [],
    netBalance: zero,
    monthlyIncome: zero,
    monthlyExpense: zero,
    monthlySavings: zero,
    days: [],
    missingRate: null,
    ...overrides,
  };
}

/** Builds a category ranking payload for tests. */
export function categoryRankingData(
  overrides: Partial<CategoryRankingDto> = {},
): CategoryRankingDto {
  return {
    month: "2026-11",
    kind: "expense",
    reportingCurrency: "CNY",
    total: money("0.00"),
    rows: [],
    missingRate: null,
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
    transactions: [],
    transactionError: null,
    dashboard: null,
    dashboardError: null,
    categoryRanking: null,
    rankingError: null,
    lastDashboardMonth: null,
    lastRankingMonth: null,
    lastRankingKind: null,
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

  const scaleFor = (code: string) => (code === "JPY" || code === "KRW" ? 0 : 2);

  const accountCurrency = (id: string) =>
    state.masterData.accounts.find((account) => account.id === id)?.currencyCode ?? "USD";

  const buildTransaction = (
    request: TransactionCreateRequestDto,
    id: string,
    createdAt = "2026-11-27T00:00:00Z",
  ): TransactionDto => {
    const currencyCode = accountCurrency(request.accountId);
    const destinationCurrency = request.destinationAccountId
      ? accountCurrency(request.destinationAccountId)
      : null;
    return {
      id,
      kind: request.kind,
      direction:
        request.kind === "expense"
          ? "outflow"
          : request.kind === "income"
            ? "inflow"
            : request.kind === "transfer"
              ? "neutral"
              : "opening",
      amountText: request.amountText,
      currencyCode,
      scale: scaleFor(currencyCode),
      destinationAmountText: request.destinationAmountText ?? null,
      destinationCurrencyCode: request.destinationAmountText ? destinationCurrency : null,
      destinationScale:
        request.destinationAmountText && destinationCurrency ? scaleFor(destinationCurrency) : null,
      occurredAt: `${request.occurredAt}:00Z`,
      occurredOn: request.occurredAt.slice(0, 10),
      occurredAtLocal: request.occurredAt,
      accountId: request.accountId,
      destinationAccountId: request.destinationAccountId ?? null,
      categoryId: request.categoryId ?? null,
      tagIds: [...request.tagIds],
      counterpartyId: request.counterpartyId ?? null,
      note: request.note ?? null,
      isDeleted: false,
      createdAt,
    };
  };

  const transactionMatches = (entry: TransactionDto, request: TransactionQueryRequestDto) => {
    if (request.scope === "deleted" ? !entry.isDeleted : entry.isDeleted) {
      return false;
    }
    if (request.kind && entry.kind !== request.kind) {
      return false;
    }
    if (
      request.accountId &&
      entry.accountId !== request.accountId &&
      entry.destinationAccountId !== request.accountId
    ) {
      return false;
    }
    if (request.categoryId && entry.categoryId !== request.categoryId) {
      return false;
    }
    if (request.tagId && !entry.tagIds.includes(request.tagId)) {
      return false;
    }
    if (request.counterpartyId && entry.counterpartyId !== request.counterpartyId) {
      return false;
    }
    if (request.startDay && entry.occurredOn < request.startDay) {
      return false;
    }
    if (request.endDay && entry.occurredOn > request.endDay) {
      return false;
    }
    if (request.searchText) {
      const name = (list: { id: string; name: string }[], id: string | null | undefined) =>
        list.find((item) => item.id === id)?.name ?? "";
      const haystack = [
        entry.note ?? "",
        name(state.masterData.accounts, entry.accountId),
        name(state.masterData.accounts, entry.destinationAccountId),
        name(state.masterData.categories, entry.categoryId),
        name(state.masterData.counterparties, entry.counterpartyId),
        ...entry.tagIds.map((id) => name(state.masterData.tags, id)),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(request.searchText.toLowerCase())) {
        return false;
      }
    }
    return true;
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
    transactionList: async (request: TransactionQueryRequestDto): Promise<TransactionListDto> => {
      if (state.transactionError) {
        throw state.transactionError;
      }
      requireLedger();
      const transactions = state.transactions
        .filter((entry) => transactionMatches(entry, request))
        .sort(
          (left, right) =>
            right.occurredOn.localeCompare(left.occurredOn) ||
            right.occurredAtLocal.localeCompare(left.occurredAtLocal),
        );
      return { transactions };
    },
    transactionGet: async (transactionId: string) => {
      requireLedger();
      const entry = state.transactions.find((transaction) => transaction.id === transactionId);
      if (!entry) {
        throw new IpcError({
          code: "not_found",
          messageKey: "errors.transaction_not_found",
          details: null,
        });
      }
      return { ...entry, tagIds: [...entry.tagIds] };
    },
    transactionCreate: async (request: TransactionCreateRequestDto) => {
      if (state.transactionError) {
        throw state.transactionError;
      }
      requireLedger();
      const entry = buildTransaction(request, `transaction-${state.transactions.length + 1}`);
      state.transactions = [entry, ...state.transactions];
      return entry;
    },
    transactionUpdate: async (request: TransactionUpdateRequestDto) => {
      if (state.transactionError) {
        throw state.transactionError;
      }
      requireLedger();
      const existing = state.transactions.find((transaction) => transaction.id === request.id);
      if (!existing) {
        throw new IpcError({
          code: "not_found",
          messageKey: "errors.transaction_not_found",
          details: null,
        });
      }
      const updated = buildTransaction(request, existing.id, existing.createdAt);
      state.transactions = state.transactions.map((transaction) =>
        transaction.id === updated.id ? updated : transaction,
      );
      return updated;
    },
    transactionDelete: async (transactionId: string) => {
      requireLedger();
      const existing = state.transactions.find((transaction) => transaction.id === transactionId);
      if (!existing) {
        throw new IpcError({
          code: "not_found",
          messageKey: "errors.transaction_not_found",
          details: null,
        });
      }
      const deleted = { ...existing, isDeleted: true };
      state.transactions = state.transactions.map((transaction) =>
        transaction.id === deleted.id ? deleted : transaction,
      );
      return deleted;
    },
    transactionRestore: async (transactionId: string) => {
      requireLedger();
      const existing = state.transactions.find((transaction) => transaction.id === transactionId);
      if (!existing) {
        throw new IpcError({
          code: "not_found",
          messageKey: "errors.transaction_not_found",
          details: null,
        });
      }
      const restored = { ...existing, isDeleted: false };
      state.transactions = state.transactions.map((transaction) =>
        transaction.id === restored.id ? restored : transaction,
      );
      return restored;
    },
    dashboardLoad: async (request: DashboardRequestDto) => {
      state.lastDashboardMonth = request.month ?? "";
      if (state.dashboardError) {
        throw state.dashboardError;
      }
      requireLedger();
      return state.dashboard ?? dashboardData({ month: request.month || "2026-11" });
    },
    reportCategoryRanking: async (request: CategoryRankingRequestDto) => {
      state.lastRankingMonth = request.month ?? "";
      state.lastRankingKind = request.kind;
      if (state.rankingError) {
        throw state.rankingError;
      }
      requireLedger();
      return (
        state.categoryRanking ??
        categoryRankingData({ month: request.month || "2026-11", kind: request.kind })
      );
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
