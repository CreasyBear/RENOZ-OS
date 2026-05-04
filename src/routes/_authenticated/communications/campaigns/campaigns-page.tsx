/**
 * Campaigns Page Component
 *
 * Container component that fetches campaign data and passes to CampaignsList presenter.
 * Handles all data fetching, mutations, and navigation.
 *
 * @source campaigns from useCampaigns hook
 * @source mutations from usePauseCampaign, useDeleteCampaign hooks
 *
 * @see src/routes/_authenticated/communications/campaigns/index.tsx - Route definition
 * @see docs/plans/2026-01-24-refactor-communications-full-container-presenter-plan.md
 */
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCampaigns,
  useDeleteCampaign,
  useDuplicateCampaign,
  useTestSendCampaign,
  useCancelCampaign,
  usePauseCampaign,
  useResumeCampaign,
} from "@/hooks/communications";
import { CampaignsList, type CampaignListItem } from "@/components/domain/communications";
import { toastSuccess, toastError } from "@/hooks";
import { useConfirmation, confirmations } from "@/hooks/_shared/use-confirmation";
import { ErrorState } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { executeBulkAction, summarizeBulkFailures, type BulkActionFailure } from "@/lib/actions/bulk-action-results";

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
  const [bulkFailures, setBulkFailures] = useState<BulkActionFailure[]>([]);
  const [bulkFailedIds, setBulkFailedIds] = useState<string[] | undefined>();

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

  const campaigns: CampaignListItem[] = transformCampaignsToListItems(
    (campaignsData as { items?: Campaign[] } | undefined)?.items ?? []
  );

  // ============================================================================
  // MUTATIONS
  // ============================================================================
  const pauseMutation = usePauseCampaign();
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
        setBulkFailures([]);
        setBulkFailedIds(undefined);
        toastSuccess("Campaign cancelled", {
          action: {
            label: "View campaign",
            onClick: () => handleView(id),
          },
        });
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Failed to cancel campaign");
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
        setBulkFailures([]);
        setBulkFailedIds(undefined);
        toastSuccess("Campaign deleted", {
          action: {
            label: "Create new",
            onClick: handleCreate,
          },
        });
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Failed to delete campaign");
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
        setBulkFailures([]);
        setBulkFailedIds(undefined);
        toastSuccess("Campaign duplicated", {
          action: {
            label: "View campaign",
            onClick: () => handleView((result as { id: string }).id),
          },
        });
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Failed to duplicate campaign");
      }
    },
    [duplicateMutation, handleView]
  );

  const handleTestSend = useCallback(
    async (campaignId: string, testEmail: string) => {
      try {
        await testSendMutation.mutateAsync({ campaignId, testEmail });
        setBulkFailures([]);
        setBulkFailedIds(undefined);
        toastSuccess("Test email sent", {
          description: `Sent to ${testEmail}`,
        });
      } catch (error) {
        toastError(error instanceof Error ? error.message : "Failed to send test email");
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

      const result = await executeBulkAction({
        items: ids,
        getId: (id) => id,
        getLabel: (id) => campaigns.find((campaign) => campaign.id === id)?.name ?? id,
        run: (id) => deleteMutation.mutateAsync({ id }),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });

      if (result.succeededIds.length > 0) {
        toastSuccess(
          `${result.succeededIds.length} campaign${result.succeededIds.length === 1 ? "" : "s"} deleted`
        );
      }

      if (result.failed.length > 0) {
        setBulkFailures(result.failed);
        setBulkFailedIds(result.failed.map((failure) => failure.id));
        toastError(`${result.failed.length} campaign delete${result.failed.length === 1 ? "" : "s"} failed`, {
          description: summarizeBulkFailures(result.failed),
        });
        return;
      }

      setBulkFailures([]);
      setBulkFailedIds(undefined);
    },
    [campaigns, confirm, deleteMutation, queryClient]
  );

  const handleBulkPause = useCallback(
    async (ids: string[]) => {
      const result = await executeBulkAction({
        items: ids,
        getId: (id) => id,
        getLabel: (id) => campaigns.find((campaign) => campaign.id === id)?.name ?? id,
        run: (id) => pauseMutation.mutateAsync({ id }),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });

      if (result.succeededIds.length > 0) {
        toastSuccess(
          `${result.succeededIds.length} campaign${result.succeededIds.length === 1 ? "" : "s"} paused`
        );
      }

      if (result.failed.length > 0) {
        setBulkFailures(result.failed);
        setBulkFailedIds(result.failed.map((failure) => failure.id));
        toastError(`${result.failed.length} campaign pause${result.failed.length === 1 ? "" : "s"} failed`, {
          description: summarizeBulkFailures(result.failed),
        });
        return;
      }

      setBulkFailures([]);
      setBulkFailedIds(undefined);
    },
    [campaigns, pauseMutation, queryClient]
  );

  const resumeMutation = useResumeCampaign();

  const handleBulkResume = useCallback(
    async (ids: string[]) => {
      const result = await executeBulkAction({
        items: ids,
        getId: (id) => id,
        getLabel: (id) => campaigns.find((campaign) => campaign.id === id)?.name ?? id,
        run: (id) => resumeMutation.mutateAsync({ id }),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.communications.campaigns(),
      });

      if (result.succeededIds.length > 0) {
        toastSuccess(
          `${result.succeededIds.length} campaign${result.succeededIds.length === 1 ? "" : "s"} resumed`
        );
      }

      if (result.failed.length > 0) {
        setBulkFailures(result.failed);
        setBulkFailedIds(result.failed.map((failure) => failure.id));
        toastError(`${result.failed.length} campaign resume${result.failed.length === 1 ? "" : "s"} failed`, {
          description: summarizeBulkFailures(result.failed),
        });
        return;
      }

      setBulkFailures([]);
      setBulkFailedIds(undefined);
    },
    [campaigns, resumeMutation, queryClient]
  );

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error && !campaignsData) {
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
  return (
    <div className="space-y-4">
      {error ? (
        <Alert>
          <AlertTitle>Showing cached campaigns</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error.message}</span>
            <button
              type="button"
              className="text-sm font-medium underline underline-offset-4"
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      ) : null}
      {bulkFailures.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>
            {bulkFailures.length} campaign bulk failure{bulkFailures.length > 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-1">
              {bulkFailures.slice(0, 5).map((failure) => (
                <div key={failure.id}>
                  {failure.label}: {failure.message}
                </div>
              ))}
              {bulkFailures.length > 5 && (
                <div>...and {bulkFailures.length - 5} more.</div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
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
        isBulkPausing={pauseMutation.isPending}
        isBulkResuming={resumeMutation.isPending}
        selectedIdsOverride={bulkFailedIds}
      />
    </div>
  );
}
