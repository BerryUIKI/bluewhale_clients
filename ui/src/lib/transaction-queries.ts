import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TransactionCreateRequestDto,
  TransactionDto,
  TransactionKindDto,
  TransactionListDto,
  TransactionScopeDto,
  TransactionUpdateRequestDto,
} from "@bluewhale/ipc";
import { useIpc } from "./ipc-context";
import { useActiveLedgerProfile } from "./ledger-queries";

/** The transaction history filter state. */
export interface TransactionFilters {
  searchText: string;
  kind: TransactionKindDto | null;
  accountId: string | null;
  categoryId: string | null;
  tagId: string | null;
  counterpartyId: string | null;
  startDay: string;
  endDay: string;
}

/** The unfiltered history state. */
export const emptyTransactionFilters: TransactionFilters = {
  searchText: "",
  kind: null,
  accountId: null,
  categoryId: null,
  tagId: null,
  counterpartyId: null,
  startDay: "",
  endDay: "",
};

export const transactionKeys = {
  all: ["transactions"] as const,
};

/** Loads a transaction list in the active ledger. */
export function useTransactionList(scope: TransactionScopeDto, filters: TransactionFilters) {
  const ipc = useIpc();
  const profile = useActiveLedgerProfile();
  return useQuery<TransactionListDto>({
    queryKey: ["transactions", "list", profile.data?.id ?? "none", scope, filters],
    queryFn: () =>
      ipc.transactionList({
        scope,
        searchText: filters.searchText,
        kind: filters.kind,
        accountId: filters.accountId,
        categoryId: filters.categoryId,
        tagId: filters.tagId,
        counterpartyId: filters.counterpartyId,
        startDay: filters.startDay === "" ? null : filters.startDay,
        endDay: filters.endDay === "" ? null : filters.endDay,
      }),
    placeholderData: (previous) => previous,
  });
}

/** Loads one transaction for editing. */
export function useTransaction(transactionId: string | null) {
  const ipc = useIpc();
  const profile = useActiveLedgerProfile();
  return useQuery<TransactionDto>({
    queryKey: ["transactions", "item", profile.data?.id ?? "none", transactionId ?? "none"],
    queryFn: () => ipc.transactionGet(transactionId ?? ""),
    enabled: transactionId !== null,
  });
}

function useTransactionMutation<TArguments, TResult>(
  mutation: (ipc: ReturnType<typeof useIpc>, arguments_: TArguments) => Promise<TResult>,
) {
  const ipc = useIpc();
  const client = useQueryClient();
  return useMutation<TResult, Error, TArguments>({
    mutationFn: (arguments_: TArguments) => mutation(ipc, arguments_),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

/** Creates a transaction. */
export function useCreateTransaction() {
  return useTransactionMutation<TransactionCreateRequestDto, TransactionDto>((ipc, request) =>
    ipc.transactionCreate(request),
  );
}

/** Updates a transaction. */
export function useUpdateTransaction() {
  return useTransactionMutation<TransactionUpdateRequestDto, TransactionDto>((ipc, request) =>
    ipc.transactionUpdate(request),
  );
}

/** Soft-deletes a transaction. */
export function useDeleteTransaction() {
  return useTransactionMutation<string, TransactionDto>((ipc, id) => ipc.transactionDelete(id));
}

/** Restores a soft-deleted transaction. */
export function useRestoreTransaction() {
  return useTransactionMutation<string, TransactionDto>((ipc, id) => ipc.transactionRestore(id));
}
