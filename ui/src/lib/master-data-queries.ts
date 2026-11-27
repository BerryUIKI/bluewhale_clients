import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AccountCreateRequestDto,
  AccountDto,
  AccountGroupCreateRequestDto,
  AccountGroupDto,
  AccountGroupUpdateRequestDto,
  AccountUpdateRequestDto,
  CategoryCreateRequestDto,
  CategoryDto,
  CategoryGroupCreateRequestDto,
  CategoryGroupDto,
  CategoryGroupUpdateRequestDto,
  CategoryUpdateRequestDto,
  CounterpartyCreateRequestDto,
  CounterpartyDto,
  CounterpartyUpdateRequestDto,
  MasterDataDto,
  TagCreateRequestDto,
  TagDto,
  TagUpdateRequestDto,
} from "@bluewhale/ipc";
import { useIpc } from "./ipc-context";
import { useActiveLedgerProfile } from "./ledger-queries";

export const masterDataKeys = {
  all: ["master-data"] as const,
  forLedger: (ledgerId: string) => ["master-data", ledgerId] as const,
};

/**
 * Loads every master-data record of the open ledger.
 *
 * The key carries the active ledger so switching reloads the screens. The
 * query stays enabled without an active ledger so the screens can report the
 * missing selection instead of loading forever.
 */
export function useMasterData() {
  const ipc = useIpc();
  const profile = useActiveLedgerProfile();
  return useQuery<MasterDataDto>({
    queryKey: masterDataKeys.forLedger(profile.data?.id ?? "none"),
    queryFn: () => ipc.masterData(),
  });
}

function useMasterDataMutation<TArguments, TResult>(
  mutation: (ipc: ReturnType<typeof useIpc>, arguments_: TArguments) => Promise<TResult>,
) {
  const ipc = useIpc();
  const client = useQueryClient();
  return useMutation<TResult, Error, TArguments>({
    mutationFn: (arguments_: TArguments) => mutation(ipc, arguments_),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: masterDataKeys.all });
    },
  });
}

/** Creates an account and its optional opening balance. */
export function useAccountCreate() {
  return useMasterDataMutation<AccountCreateRequestDto, AccountDto>((ipc, request) =>
    ipc.accountCreate(request),
  );
}

/** Updates an account without changing its currency. */
export function useAccountUpdate() {
  return useMasterDataMutation<AccountUpdateRequestDto, AccountDto>((ipc, request) =>
    ipc.accountUpdate(request),
  );
}

/** Creates an account group. */
export function useAccountGroupCreate() {
  return useMasterDataMutation<AccountGroupCreateRequestDto, AccountGroupDto>((ipc, request) =>
    ipc.accountGroupCreate(request),
  );
}

/** Updates an account group. */
export function useAccountGroupUpdate() {
  return useMasterDataMutation<AccountGroupUpdateRequestDto, AccountGroupDto>((ipc, request) =>
    ipc.accountGroupUpdate(request),
  );
}

/** Creates a category group. */
export function useCategoryGroupCreate() {
  return useMasterDataMutation<CategoryGroupCreateRequestDto, CategoryGroupDto>((ipc, request) =>
    ipc.categoryGroupCreate(request),
  );
}

/** Updates a category group. */
export function useCategoryGroupUpdate() {
  return useMasterDataMutation<CategoryGroupUpdateRequestDto, CategoryGroupDto>((ipc, request) =>
    ipc.categoryGroupUpdate(request),
  );
}

/** Creates a leaf category. */
export function useCategoryCreate() {
  return useMasterDataMutation<CategoryCreateRequestDto, CategoryDto>((ipc, request) =>
    ipc.categoryCreate(request),
  );
}

/** Updates a leaf category. */
export function useCategoryUpdate() {
  return useMasterDataMutation<CategoryUpdateRequestDto, CategoryDto>((ipc, request) =>
    ipc.categoryUpdate(request),
  );
}

/** Creates a tag. */
export function useTagCreate() {
  return useMasterDataMutation<TagCreateRequestDto, TagDto>((ipc, request) =>
    ipc.tagCreate(request),
  );
}

/** Updates a tag. */
export function useTagUpdate() {
  return useMasterDataMutation<TagUpdateRequestDto, TagDto>((ipc, request) =>
    ipc.tagUpdate(request),
  );
}

/** Creates a counterparty. */
export function useCounterpartyCreate() {
  return useMasterDataMutation<CounterpartyCreateRequestDto, CounterpartyDto>((ipc, request) =>
    ipc.counterpartyCreate(request),
  );
}

/** Updates a counterparty. */
export function useCounterpartyUpdate() {
  return useMasterDataMutation<CounterpartyUpdateRequestDto, CounterpartyDto>((ipc, request) =>
    ipc.counterpartyUpdate(request),
  );
}
