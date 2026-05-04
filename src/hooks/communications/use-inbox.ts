/**
 * Inbox Hooks
 *
 * Thin TanStack Query wrapper over the canonical server-side inbox read.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { queryKeys } from "@/lib/query-keys";
import { normalizeReadQueryError } from "@/lib/read-path-policy";
import { QUERY_CONFIG, LIMITS } from "@/lib/constants";
import { listInboxItems } from "@/server/functions/communications/inbox";
import type { InboxListQuery, InboxListResult } from "@/lib/schemas/communications/inbox";

export function useInbox(
  filters: InboxListQuery = {
    page: 1,
    pageSize: LIMITS.EMAIL_SYNC_MAX_EMAILS,
    tab: "all",
  }
) {
  const listInboxItemsFn = useServerFn(listInboxItems);

  return useQuery<InboxListResult>({
    queryKey: queryKeys.communications.inboxList(filters),
    queryFn: async () => {
      try {
        return (await listInboxItemsFn({ data: filters })) as InboxListResult;
      } catch (error) {
        throw normalizeReadQueryError(error, {
          contractType: "always-shaped",
          fallbackMessage:
            "Inbox is temporarily unavailable. Please refresh and try again.",
        });
      }
    },
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });
}
