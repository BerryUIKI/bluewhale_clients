import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActiveLedgerProfileDto,
  CreateLedgerRequestDto,
  LedgerListDto,
  LedgerSummaryDto,
  RemovedLedgerDto,
} from "@bluewhale/ipc";
import { useIpc } from "./ipc-context";

export const ledgerKeys = {
  all: ["ledgers"] as const,
  list: ["ledgers", "list"] as const,
  activeProfile: ["ledgers", "active-profile"] as const,
};

/** Loads the ledger selector data. */
export function useLedgerList() {
  const ipc = useIpc();
  return useQuery<LedgerListDto>({
    queryKey: ledgerKeys.list,
    queryFn: () => ipc.ledgerList(),
  });
}

/** Loads the profile of the open ledger. */
export function useActiveLedgerProfile() {
  const ipc = useIpc();
  return useQuery<ActiveLedgerProfileDto | null>({
    queryKey: ledgerKeys.activeProfile,
    queryFn: () => ipc.ledgerActiveProfile(),
  });
}

function useLedgerMutation<TArguments, TResult>(
  mutation: (ipc: ReturnType<typeof useIpc>, arguments_: TArguments) => Promise<TResult>,
) {
  const ipc = useIpc();
  const client = useQueryClient();
  return useMutation<TResult, Error, TArguments>({
    mutationFn: (arguments_: TArguments) => mutation(ipc, arguments_),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ledgerKeys.all });
    },
  });
}

/** Creates a ledger and selects it. */
export function useCreateLedger() {
  return useLedgerMutation<CreateLedgerRequestDto, LedgerSummaryDto>((ipc, request) =>
    ipc.ledgerCreate(request),
  );
}

/** Opens and selects a ledger. */
export function useSwitchLedger() {
  return useLedgerMutation<string, LedgerSummaryDto>((ipc, ledgerId) => ipc.ledgerSwitch(ledgerId));
}

/** Removes a ledger from this device without deleting its files. */
export function useRemoveLedger() {
  return useLedgerMutation<string, RemovedLedgerDto>((ipc, ledgerId) => ipc.ledgerRemove(ledgerId));
}
