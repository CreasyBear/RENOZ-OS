/**
 * Campaigns Page Component
 *
 * Container component that fetches campaign data and passes to CampaignsList presenter.
 * Handles all data fetching, mutations, and navigation.
 *
 * @source campaigns from useCampaigns hook
 * @source mutations from useCancelCampaign, useDeleteCampaign hooks
 *
 * @see src/routes/_authenticated/communications/campaigns/index.tsx - Route definition
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCampaigns,
  useCancelCampaign,
  useDeleteCampaign,
  useDuplicateCampaign,
  useTestSendCampaign,
  useResumeCampaign,
} from "@/hooks/communications";
import { CampaignsList, type CampaignListItem } from "@/components/domain/communications";
import { toastSuccess, toastError } from "@/hooks";
import { useConfirmation, confirmations } from "@/hooks/_shared/use-confirmation";
import { ErrorState } from "@/components/shared";
import { transformCampaignsToListItems } from "@/lib/communications/campaign-utils";
import type { Campaign } from "@/lib/schemas/communications";
import { DomainFilterBar } from "@/components/shared/filters";
import {
  CAMPAIGN_FILTER_CONFIG,
  DEFAULT_CAMPAIGN_FILTERS,
  type CampaignFiltersState,
} from "@/components/domain/communications/campaigns/campaign-filter-config";
import { useTransformedFilterUrlState } from "@/hooks/filters/use-filter-url-state";
import { queryKeys } from "@/lib/query-keys";
import { Route, searchParamsSchema } from "./index";
import type { z } from "zod";

type SearchParams = z.infer<typeof searchParamsSchema>;

// ============================================================================
// URL FILTER TRANSFORMERS
// ============================================================================

/** Transform URL search params to CampaignFiltersState */
const fromUrlParams = (search: SearchParams): CampaignFiltersState => ({
  search: search.search ?? "",
  status: search.status ? [search.status] : [],
  templateType: search.templateType ? [search.templateType] : [],
  dateFrom: search.dateFrom ? new Date(search.dateFrom) : null,
  dateTo: search.dateTo ? new Date(search.dateTo) : null,
});

/** Transform CampaignFiltersState to URL search params */
const toUrlParams = (filters: CampaignFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status[0] : undefined,
  templateType: filters.templateType.length > 0 ? filters.templateType[0] : undefined,
  dateFrom: filters.dateFrom ? filters.dateFrom.toISOString() : undefined,
  dateTo: filters.dateTo ? filters.dateTo.toISOString() : undefined,
});

export default function CampaignsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as SearchParams;
  const queryClient = useQueryClient();

  // ============================================================================
  // CONFIRMATION
  // ============================================================================
  const confirm = useConfirmation();

  // ============================================================================
  // URL-SYNCED FILTER STATE
  // ============================================================================
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_CAMPAIGN_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'templateType', 'dateFrom', 'dateTo'],
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const {
    data: campaignsData,
    isLoading,
    error,
    refetch,
  } = useCampaigns({
    status: filters.status.length > 0 ? filters.status[0] : undefined,
    search: filters.search || undefined,
    templateType: filters.templateType.length > 0 ? filters.templateType[0] : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    limit: search.pageSize,
    offset: (search.page - 1) * search.pageSize,
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const cancelMutation = useCancelCampaign();
  const deleteMutation = useDeleteCampaign();
  const duplicateMutation = useDuplicateCampaign();
  const testSendMutation = useTestSendCampaign();

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleView = useCallback(
    (id: string) => {
      navigate({
        to: "/communications/campaigns/$campaignId",
        params: { campaignId: id },
      });
    },
    [navigate]
  );

  const handleCreate = useCallback(() => {
    navigate({ to: "/communications/campaigns/new" });
  }, [navigate]);

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await cancelMutation.mutateAsync({ id });
        toastSuccess("Campaign paused", {
          action: {
            label: "View campaign",
            onClick: () => handleView(id),
          },
        });
      } catch {
        toastError("Failed to pause campaign");
      }
    },
    [cancelMutation, handleView]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const { confirmed } = await confirm.confirm(
        confirmations.delete("this campaign", "campaign")
      );

      if (!confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id });
        toastSuccess("Campaign deleted", {
          action: {
            label: "Create new",
            onClick: handleCreate,
          },
        });
      } catch {
        toastError("Failed to delete campaign");
      }
    },
    [confirm, deleteMutation, handleCreate]
  );

  const handleFiltersChange = useCallback((newFilters: CampaignFiltersState) => {
    setFilters(newFilters);
  }, [setFilters]);

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        const result = await duplicateMutation.mutateAsync({ id });
        toastSuccess("Campaign duplicated", {
          action: {
            label: "View campaign",
            onClick: () => handleView((result as { id: string }).id),
          },
        });
      } catch {
        toastError("Failed to duplicate campaign");
      }
    },
    [duplicateMutation, handleView]
  );

  const handleTestSend = useCallback(
    async (campaignId: string, testEmail: string) => {
      try {
        await testSendMutation.mutateAsync({ campaignId, testEmail });
        toastSuccess("Test email sent", {
          description: `Sent to ${testEmail}`,
        });
      } catch {
        toastError("Failed to send test email");
      }
    },
    [testSendMutation]
  );

  const handleBulkDelete = useCallback(
    async (ids: string[]) => {
      const { confirmed } = await confirm.confirm(
        confirmations.delete(`${ids.length} campaign${ids.length === 1 ? "" : "s"}`, "campaign")
      );

      if (!confirmed) return;

      try {
        const results = await Promise.allSettled(
          ids.map((id) => deleteMutation.mutateAsync({ id }))
        );
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        
        // Invalidate queries after bulk delete
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.campaigns(),
        });
        
        if (failed > 0) {
          toastError(`${succeeded} deleted, ${failed} failed`);
        } else {
          toastSuccess(`${ids.length} campaign${ids.length === 1 ? "" : "s"} deleted`);
        }
      } catch {
        toastError("Failed to delete campaigns");
      }
    },
    [confirm, deleteMutation, queryClient]
  );

  const handleBulkPause = useCallback(
    async (ids: string[]) => {
      try {
        const results = await Promise.allSettled(
          ids.map((id) => cancelMutation.mutateAsync({ id }))
        );
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        
        // Invalidate queries after bulk pause
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.campaigns(),
        });
        
        if (failed > 0) {
          toastError(`${succeeded} paused, ${failed} failed`);
        } else {
          toastSuccess(`${ids.length} campaign${ids.length === 1 ? "" : "s"} paused`);
        }
      } catch {
        toastError("Failed to pause campaigns");
      }
    },
    [cancelMutation, queryClient]
  );

  const resumeMutation = useResumeCampaign();

  const handleBulkResume = useCallback(
    async (ids: string[]) => {
      try {
        const results = await Promise.allSettled(
          ids.map((id) => resumeMutation.mutateAsync({ id }))
        );
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        
        // Invalidate queries after bulk resume
        queryClient.invalidateQueries({
          queryKey: queryKeys.communications.campaigns(),
        });
        
        if (failed > 0) {
          toastError(`${succeeded} resumed, ${failed} failed`);
        } else {
          toastSuccess(`${ids.length} campaign${ids.length === 1 ? "" : "s"} resumed`);
        }
      } catch {
        toastError("Failed to resume campaigns");
      }
    },
    [resumeMutation, queryClient]
  );

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <ErrorState
        title="Failed to load campaigns"
        message="There was an error loading your email campaigns."
        onRetry={() => refetch()}
      />
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  // Transform server response to CampaignListItem format using utility function
  const campaigns: CampaignListItem[] = transformCampaignsToListItems(
    (campaignsData as { items?: Campaign[] } | undefined)?.items ?? []
  );

  return (
    <div className="space-y-4">
      <DomainFilterBar
        config={CAMPAIGN_FILTER_CONFIG}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        defaultFilters={DEFAULT_CAMPAIGN_FILTERS}
      />
      <CampaignsList
        campaigns={campaigns}
        isLoading={isLoading}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onView={handleView}
        onCreate={handleCreate}
        onDuplicate={handleDuplicate}
        onTestSend={handleTestSend}
        onBulkDelete={handleBulkDelete}
        onBulkPause={handleBulkPause}
        onBulkResume={handleBulkResume}
        isCancelling={cancelMutation.isPending}
        isDeleting={deleteMutation.isPending}
        isDuplicating={duplicateMutation.isPending}
        isTestSending={testSendMutation.isPending}
        isBulkDeleting={deleteMutation.isPending}
        isBulkPausing={cancelMutation.isPending}
        isBulkResuming={resumeMutation.isPending}
      />
    </div>
  );
}
