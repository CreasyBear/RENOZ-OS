/**
 * Inbox Page Component (Container)
 *
 * Container component that fetches inbox data and passes to Inbox presenter.
 * Handles all data fetching, filter state, and URL synchronization.
 *
 * @source inbox items from useInbox hook
 *
 * @see src/routes/_authenticated/communications/inbox/index.tsx - Route definition
 * @see STANDARDS.md - Container/presenter pattern
 * @see SCHEMA-TRACE.md - Data flow trace
 */

import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useInbox } from "@/hooks/communications";
import { Inbox } from "@/components/domain/communications/inbox/inbox";
import {
  DEFAULT_INBOX_FILTERS,
  type InboxFiltersState,
} from "@/components/domain/communications/inbox/inbox-filter-config";
import { useTransformedFilterUrlState } from "@/hooks/filters/use-filter-url-state";
import { RouteErrorFallback } from "@/components/layout";
import { Route, inboxSearchParamsSchema } from "./index";
import type { z } from "zod";

type SearchParams = z.infer<typeof inboxSearchParamsSchema>;

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to InboxFiltersState */
const fromUrlParams = (search: SearchParams): InboxFiltersState => ({
  search: search.search ?? "",
  tab: search.tab ?? "all",
  status: search.status,
  type: search.type,
  customerId: search.customerId,
  campaignId: search.campaignId,
  dateFrom: search.dateFrom ? new Date(search.dateFrom) : null,
  dateTo: search.dateTo ? new Date(search.dateTo) : null,
});

/** Transform InboxFiltersState to URL search params */
const toUrlParams = (filters: InboxFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  tab: filters.tab,
  status: filters.status || undefined,
  type: filters.type && filters.type.length > 0 ? filters.type : undefined,
  customerId: filters.customerId || undefined,
  campaignId: filters.campaignId || undefined,
  dateFrom: filters.dateFrom ? filters.dateFrom.toISOString() : undefined,
  dateTo: filters.dateTo ? filters.dateTo.toISOString() : undefined,
});

export default function InboxPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as SearchParams;

  // ============================================================================
  // URL-SYNCED FILTER STATE
  // ============================================================================
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_INBOX_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ["search", "status", "type", "customerId", "campaignId", "dateFrom", "dateTo", "tab"],
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  // Transform status filter - ensure type safety
  const statusFilter = filters.status && 
    ["sent", "delivered", "opened", "clicked", "pending", "bounced", "failed"].includes(filters.status)
    ? filters.status as "sent" | "delivered" | "opened" | "clicked" | "pending" | "bounced" | "failed"
    : undefined;

  const { items, isLoading, error, refetch } = useInbox({
    search: filters.search || undefined,
    tab: filters.tab,
    status: statusFilter,
    type: filters.type as ("history" | "scheduled" | "campaign")[] | undefined,
    customerId: filters.customerId,
    campaignId: filters.campaignId,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page: search.page,
    pageSize: search.pageSize,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleFiltersChange = useCallback(
    (newFilters: InboxFiltersState) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <RouteErrorFallback error={error as Error} parentRoute="/communications" onRetry={resetErrorBoundary} />
      )}
    >
      <Inbox
        items={items}
        isLoading={isLoading}
        error={error}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRetry={refetch}
      />
    </ErrorBoundary>
  );
}
