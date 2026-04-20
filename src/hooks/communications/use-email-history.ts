/**
 * Email History Hooks
 *
 * TanStack Query hooks for organization-level email history.
 */
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { QUERY_CONFIG } from "@/lib/constants";
import { normalizeReadQueryError } from "@/lib/read-path-policy";
import { listEmailHistory } from "@/server/functions/communications/email-history";
import type { EmailHistoryListQuery } from "@/lib/schemas/communications/email-history";

export function useEmailHistory(filters: EmailHistoryListQuery = { pageSize: 25 }) {
  return useQuery({
    queryKey: queryKeys.communications.emailHistoryList(filters),
    queryFn: async () => {
      try {
        return await listEmailHistory({ data: filters });
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: "always-shaped",
          fallbackMessage: "Email history is temporarily unavailable. Please refresh and try again.",
        });
      }
    },
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });
}
