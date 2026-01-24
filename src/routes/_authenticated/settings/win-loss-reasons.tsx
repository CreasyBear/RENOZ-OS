/**
 * Win/Loss Reasons Settings Route
 *
 * Container route for managing win/loss reasons.
 * Provides data fetching and mutations for the WinLossReasonsManager presenter.
 *
 * @see _Initiation/_prd/2-domains/pipeline/pipeline.prd.json (PIPE-WINLOSS-UI)
 */

import { useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RouteErrorFallback } from '@/components/layout';
import { SettingsPageSkeleton } from '@/components/skeletons/settings';
import { PageLayout } from '@/components/layout/page-layout';
import { WinLossReasonsManager } from '@/components/domain/settings';
import type { ReasonForm } from '@/components/domain/settings/win-loss-reasons-manager';
import {
  listWinLossReasons,
  createWinLossReason,
  updateWinLossReason,
  deleteWinLossReason,
} from '@/server/functions/pipeline/win-loss-reasons';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/lib/toast';
import { useConfirmation } from '@/hooks/use-confirmation';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/settings/win-loss-reasons')({
  component: WinLossReasonsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/settings" />
  ),
  pendingComponent: () => <SettingsPageSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function WinLossReasonsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirmation();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings.winLossReasons(),
    queryFn: async () => {
      const result = await listWinLossReasons({ data: {} });
      return result;
    },
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createMutation = useMutation({
    mutationFn: async (formData: ReasonForm) => {
      return createWinLossReason({ data: formData });
    },
    onSuccess: () => {
      toast.success('Reason created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.winLossReasons() });
    },
    onError: () => {
      toast.error('Failed to create reason');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReasonForm }) => {
      return updateWinLossReason({ data: { id, data } });
    },
    onSuccess: () => {
      toast.success('Reason updated successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.winLossReasons() });
    },
    onError: () => {
      toast.error('Failed to update reason');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteWinLossReason({ data: { id } });
    },
    onSuccess: (result) => {
      if (result.deactivated) {
        toast.success(`Reason deactivated (used by ${result.usageCount} opportunities)`);
      } else {
        toast.success('Reason deleted successfully');
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.winLossReasons() });
    },
    onError: () => {
      toast.error('Failed to delete reason');
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateReason = useCallback(
    (formData: ReasonForm) => {
      createMutation.mutate(formData);
    },
    [createMutation]
  );

  const handleUpdateReason = useCallback(
    (id: string, formData: ReasonForm) => {
      updateMutation.mutate({ id, data: formData });
    },
    [updateMutation]
  );

  const handleDeleteReason = useCallback(
    async (id: string) => {
      const confirmed = await confirm.confirm({
        title: 'Delete Reason',
        description:
          'Are you sure you want to delete this win/loss reason? If it is in use, it will be deactivated instead.',
        confirmLabel: 'Delete Reason',
        variant: 'destructive',
      });

      if (confirmed.confirmed) {
        deleteMutation.mutate(id);
      }
    },
    [confirm, deleteMutation]
  );

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const reasons = data?.reasons ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout>
      <PageLayout.Header
        title="Win/Loss Reasons"
        description="Manage reasons for winning and losing opportunities"
      />

      <PageLayout.Content>
        <WinLossReasonsManager
          reasons={reasons}
          isLoading={isLoading}
          error={error}
          onCreateReason={handleCreateReason}
          onUpdateReason={handleUpdateReason}
          onDeleteReason={handleDeleteReason}
          isSaving={isSaving}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
