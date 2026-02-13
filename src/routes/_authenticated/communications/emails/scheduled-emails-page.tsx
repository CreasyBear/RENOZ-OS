/**
 * Scheduled Emails Page Component
 *
 * Container for ScheduledEmailsList with search filters, data fetching, and mutation callbacks.
 *
 * @source scheduled emails from useScheduledEmails hook
 * @source cancel mutation from useCancelScheduledEmail hook
 *
 * @see src/routes/_authenticated/communications/emails/index.tsx - Route definition
 */
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ScheduledEmailsList } from "@/components/domain/communications";
import { ScheduleEmailDialog } from "@/components/domain/communications";
import { DomainFilterBar } from "@/components/shared/filters";
import { useFilterUrlState } from "@/hooks/filters/use-filter-url-state";
import { useScheduledEmails, useCancelScheduledEmail } from "@/hooks/communications";
import { toastSuccess, toastError } from "@/hooks";
import {
  SCHEDULED_EMAILS_FILTER_CONFIG,
  DEFAULT_SCHEDULED_EMAILS_FILTERS,
  type ScheduledEmailsFiltersState,
} from "@/components/domain/communications/emails/scheduled-emails-filter-config";
import type { SearchParams } from './index';

interface ScheduledEmailsPageProps {
  search: SearchParams;
}

export default function ScheduledEmailsPage({ search }: ScheduledEmailsPageProps) {
  const navigate = useNavigate();
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  // ============================================================================
  // URL-SYNCED FILTER STATE
  // ============================================================================
  const { filters, setFilters } = useFilterUrlState<ScheduledEmailsFiltersState>({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_SCHEDULED_EMAILS_FILTERS,
    resetPageOnChange: ["search", "status", "customerId"],
  });

  const statusFilter = filters.status;
  const searchQuery = filters.search;

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useScheduledEmails({
    status: statusFilter === "all" ? undefined : statusFilter,
    customerId: filters.customerId,
    search: searchQuery?.trim() || undefined,
    limit: 50,
    offset: 0,
  });

  const cancelMutation = useCancelScheduledEmail();

  // Server handles all filtering (status, customerId, search)
  const emails = data?.items ?? [];
  const totalCount = data?.total ?? 0;

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleEdit = useCallback((id: string) => {
    setEditingEmailId(id);
  }, []);

  const handleCompose = useCallback(() => {
    setComposeOpen(true);
  }, []);

  const handleCreateSignature = useCallback(() => {
    navigate({ to: "/communications/signatures" });
  }, [navigate]);

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelMutation.mutateAsync({ id });
        toastSuccess("Email cancelled");
        return true;
      } catch (error) {
        toastError(
          error instanceof Error ? error.message : "Failed to cancel email"
        );
        return false;
      }
    },
    [cancelMutation]
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <>
      <DomainFilterBar
        config={SCHEDULED_EMAILS_FILTER_CONFIG}
        filters={filters}
        onFiltersChange={setFilters}
        defaultFilters={DEFAULT_SCHEDULED_EMAILS_FILTERS}
        resultCount={emails.length}
        className="mb-6"
      />

      <ScheduledEmailsList
        items={emails}
        total={emails.length}
        totalAll={totalCount}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        isRefreshing={isFetching}
        onCancel={handleCancel}
        isCancelling={cancelMutation.isPending}
        onEdit={handleEdit}
        onCompose={handleCompose}
      />

      {/* Schedule Email Dialog handled by parent */}
      <ScheduleEmailDialog
        open={composeOpen || !!editingEmailId}
        onOpenChange={(open) => {
          if (!open) {
            setComposeOpen(false);
            setEditingEmailId(null);
          }
        }}
        onCreateSignature={handleCreateSignature}
        onSuccess={() => {
          setComposeOpen(false);
          setEditingEmailId(null);
        }}
      />
    </>
  );
}
