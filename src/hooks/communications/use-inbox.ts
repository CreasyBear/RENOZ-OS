/**
 * Inbox Hooks
 *
 * TanStack Query hooks for unified inbox (email history + scheduled emails).
 * Combines multiple data sources into a unified inbox view.
 *
 * @source email history from listEmailHistory server function
 * @source scheduled emails from listScheduledEmails server function
 *
 * @see STANDARDS.md - Hook patterns
 * @see SCHEMA-TRACE.md - Data flow trace
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { queryKeys } from "@/lib/query-keys";
import { listEmailHistory } from "@/server/functions/communications/email-history";
import { getScheduledEmails } from "@/server/functions/communications/scheduled-emails";
import { QUERY_CONFIG, LIMITS } from "@/lib/constants";
import type { InboxListQuery, InboxEmailItem } from "@/lib/schemas/communications/inbox";

/**
 * Transform email history item to inbox item
 */
function transformEmailHistoryToInboxItem(item: {
  id: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml?: string | null;
  fromAddress: string;
  toAddress: string;
  status: string;
  sentAt: Date | null;
  createdAt: Date;
  customerId: string | null;
  customerName: string | null;
  senderName: string | null;
  campaignId?: string | null;
  templateId?: string | null;
  metadata?: unknown;
}): InboxEmailItem {
  const preview = item.bodyText ? item.bodyText.substring(0, LIMITS.EMAIL_PREVIEW_LENGTH) : "No preview available";
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  
  // Extract read/starred state from metadata
  const read = metadata.read === true;
  const starred = metadata.starred === true;
  
  return {
    id: item.id,
    type: "history",
    subject: item.subject || "(No subject)",
    preview,
    bodyHtml: item.bodyHtml ?? null,
    bodyText: item.bodyText ?? null,
    from: {
      name: item.senderName || item.fromAddress.split("@")[0],
      email: item.fromAddress,
      avatar: null,
    },
    to: {
      name: item.customerName || item.toAddress.split("@")[0],
      email: item.toAddress,
    },
    status: item.status,
    read,
    starred,
    sentAt: item.sentAt,
    createdAt: item.createdAt,
    customerId: item.customerId,
    campaignId: item.campaignId ?? null,
    templateId: item.templateId ?? null,
    metadata: item.metadata ? (item.metadata as { [key: string]: unknown }) : null,
  };
}

/**
 * Transform scheduled email item to inbox item
 */
function transformScheduledEmailToInboxItem(item: {
  id: string;
  subject: string;
  recipientEmail: string;
  recipientName: string | null;
  status: string;
  scheduledAt: Date;
  createdAt: Date;
  customerId: string | null;
  templateData?: unknown;
  templateType?: string;
}): InboxEmailItem {
  // Extract preview from template data if available
  const templateData = item.templateData && typeof item.templateData === 'object' ? (item.templateData as Record<string, unknown>) : null;
  const preview = templateData && 'body' in templateData
    ? String(templateData.body || '').substring(0, LIMITS.EMAIL_PREVIEW_LENGTH)
    : `Scheduled for ${item.scheduledAt.toLocaleDateString()}`;

  return {
    id: item.id,
    type: "scheduled",
    subject: item.subject,
    preview,
    from: {
      name: "System",
      email: "scheduled@system",
      avatar: null,
    },
    to: {
      name: item.recipientName || item.recipientEmail.split("@")[0],
      email: item.recipientEmail,
    },
    status: item.status,
    read: false,
    starred: false,
    sentAt: item.status === "sent" ? item.scheduledAt : null,
    createdAt: item.createdAt,
    customerId: item.customerId,
    campaignId: null,
    templateId: null,
  };
}

/**
 * Unified inbox hook - combines email history and scheduled emails
 */
export function useInbox(filters: InboxListQuery = { page: 1, pageSize: LIMITS.EMAIL_SYNC_MAX_EMAILS, tab: 'all' }) {
  // Determine which data sources to fetch based on filters and tab
  // Optimize: Don't fetch if tab filters them out
  const tabFiltersOutHistory = filters.tab === "scheduled";
  const tabFiltersOutScheduled = filters.tab === "sent" || filters.tab === "failed";
  
  const shouldFetchHistory = !tabFiltersOutHistory && (!filters.type || filters.type.includes("history"));
  const shouldFetchScheduled = !tabFiltersOutScheduled && (!filters.type || filters.type.includes("scheduled"));

  // Fetch email history
  const historyQuery = useQuery({
    queryKey: queryKeys.communications.emailHistoryList({
      status: filters.status,
      customerId: filters.customerId,
      campaignId: filters.campaignId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      pageSize: filters.pageSize,
      cursor: undefined, // Cursor pagination not yet implemented - using offset pagination
    }),
    queryFn: async () => {
      const result = await listEmailHistory({
        data: {
          status: filters.status,
          customerId: filters.customerId,
          campaignId: filters.campaignId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          search: filters.search,
          pageSize: filters.pageSize ?? LIMITS.EMAIL_SYNC_MAX_EMAILS,
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: shouldFetchHistory,
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });

  // Fetch scheduled emails
  const scheduledQuery = useQuery({
    queryKey: queryKeys.communications.scheduledEmailsList({
      status: filters.status === "pending" ? "pending" : filters.status === "sent" ? "sent" : undefined,
      customerId: filters.customerId,
      search: filters.search,
      limit: filters.pageSize,
      offset: ((filters.page ?? 1) - 1) * (filters.pageSize ?? 50),
    }),
    queryFn: async () => {
      const result = await getScheduledEmails({
        data: {
          status: filters.status === "pending" ? "pending" : filters.status === "sent" ? "sent" : undefined,
          customerId: filters.customerId,
          search: filters.search,
          limit: filters.pageSize ?? LIMITS.EMAIL_SYNC_MAX_EMAILS,
          offset: ((filters.page ?? 1) - 1) * (filters.pageSize ?? LIMITS.EMAIL_SYNC_MAX_EMAILS),
        },
      
      });
      if (result == null) throw new Error('Query returned no data');
      return result;
    },
    enabled: shouldFetchScheduled,
    staleTime: QUERY_CONFIG.STALE_TIME_SHORT,
  });

  // Combine and transform results
  const inboxItems = useMemo(() => {
    const history = historyQuery.data?.items.map(transformEmailHistoryToInboxItem) ?? [];
    const scheduled = (scheduledQuery.data?.items ?? []).map(transformScheduledEmailToInboxItem);

    // Combine and sort by date (newest first)
    const combined = [...history, ...scheduled].sort((a, b) => {
      const dateA = a.sentAt || a.createdAt;
      const dateB = b.sentAt || b.createdAt;
      return dateB.getTime() - dateA.getTime();
    });

    // Filter out deleted/archived emails (unless viewing archived tab)
    const filtered = combined.filter((item) => {
      const metadata = item.metadata as Record<string, unknown> | null;
      if (metadata?.deleted === true) return false;
      // Only filter archived if not viewing archived tab (future feature)
      // if (metadata?.archived === true && filters.tab !== "archived") return false;
      return true;
    });

    // Apply tab filter
    if (filters.tab === "unread") {
      return filtered.filter((item) => !item.read);
    }
    if (filters.tab === "sent") {
      return filtered.filter((item) => item.type === "history" && item.status === "sent");
    }
    if (filters.tab === "scheduled") {
      return filtered.filter((item) => item.type === "scheduled");
    }
    if (filters.tab === "failed") {
      return filtered.filter((item) => item.status === "failed" || item.status === "bounced");
    }

    return filtered;
  }, [historyQuery.data, scheduledQuery.data, filters.tab]);

  const refetch = useCallback(() => {
    void historyQuery.refetch();
    void scheduledQuery.refetch();
  }, [historyQuery, scheduledQuery]);

  return {
    items: inboxItems,
    isLoading: historyQuery.isLoading || scheduledQuery.isLoading,
    error: historyQuery.error || scheduledQuery.error,
    hasNextPage: historyQuery.data?.hasNextPage || false,
    refetch,
  };
}
