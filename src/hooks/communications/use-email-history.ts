/**
 * Email History Hooks
 *
 * TanStack Query hooks for organization-level email history.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { QUERY_CONFIG } from "@/lib/constants";
import { listEmailHistory } from "@/server/functions/communications/email-history";
import type { EmailHistoryListQuery } from "@/lib/schemas/communications/email-history";

export function useEmailHistory(filters: EmailHistoryListQuery = { pageSize: 25 }) {
  return useQuery({
    queryKey: queryKeys.communications.emailHistoryList(filters),
    queryFn: async () => {
      const result = await listEmailHistory({ data: filters });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });
}
