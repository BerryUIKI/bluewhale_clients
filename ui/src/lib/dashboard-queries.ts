import { useQuery } from "@tanstack/react-query";
import type { CategoryKindDto, CategoryRankingDto, DashboardDto } from "@bluewhale/ipc";
import { useIpc } from "./ipc-context";
import { useActiveLedgerProfile } from "./ledger-queries";

/** Loads the dashboard for a ledger month. */
export function useDashboard(month: string) {
  const ipc = useIpc();
  const profile = useActiveLedgerProfile();
  return useQuery<DashboardDto>({
    queryKey: ["dashboard", profile.data?.id ?? "none", month],
    queryFn: () => ipc.dashboardLoad({ month }),
    enabled: month !== "",
  });
}

/** Loads the category ranking for a ledger month and kind. */
export function useCategoryRanking(month: string, kind: CategoryKindDto) {
  const ipc = useIpc();
  const profile = useActiveLedgerProfile();
  return useQuery<CategoryRankingDto>({
    queryKey: ["reports", "category-ranking", profile.data?.id ?? "none", month, kind],
    queryFn: () => ipc.reportCategoryRanking({ month, kind }),
    enabled: month !== "",
  });
}
