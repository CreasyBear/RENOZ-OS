/**
 * RMA Detail Hook
 *
 * Composite hook that encapsulates all data fetching, mutations, and actions
 * for the RMA detail view. Follows STANDARDS.md §3: routes must not call
 * useQuery/useMutation directly; container uses this hook.
 *
 * @source rma from useRma hook
 * @source mutations from useApproveRma, useRejectRma, useReceiveRma, useProcessRma, useCancelRma
 *
 * @see STANDARDS.md - Hook patterns, Container/Presenter
 * @see SCHEMA-TRACE.md - Data flow: Route → Container (this hook) → View
 */

import { useNavigate } from '@tanstack/react-router';
import { toastSuccess, toastError } from '@/hooks';
import {
  useRma,
  useApproveRma,
  useRejectRma,
  useReceiveRma,
  useProcessRma,
  useCancelRma,
} from './use-rma';
import { useTrackView } from '@/hooks/search';
import { useConfirmation, confirmations } from '@/hooks/_shared/use-confirmation';
import { rmaInspectionNotesSchema, type RmaResolution } from '@/lib/schemas/support/rma';

// ============================================================================
// TYPES
// ============================================================================

export interface UseRmaDetailReturn {
  /** RMA data from API */
  rma: ReturnType<typeof useRma>['data'];
  /** Loading state for RMA fetch */
  isLoading: boolean;
  /** Error state for RMA fetch */
  error: Error | null;
  /** Refetch RMA data */
  onRetry: () => void;
  /** Combined pending state for all workflow mutations */
  isPending: boolean;
  /** Approve RMA (requested → approved) */
  onApprove: (notes?: string) => Promise<void>;
  /** Reject RMA (requested/approved → rejected) */
  onReject: (reason: string) => Promise<void>;
  /** Receive RMA (approved → received); restores inventory */
  onReceive: (inspectionNotes?: { condition?: string; notes?: string }) => Promise<void>;
  /** Process RMA (received → processed) */
  onProcess: (
    resolution: RmaResolution,
    details?: { refundAmount?: number; notes?: string }
  ) => Promise<void>;
  /** Cancel RMA (requested/approved → cancelled) */
  onCancel: () => Promise<void>;
  /** Cancel mutation pending state */
  isCancelPending: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useRmaDetail(rmaId: string): UseRmaDetailReturn {
  const navigate = useNavigate();
  const { confirm } = useConfirmation();

  const { data: rma, isLoading, error, refetch } = useRma({ rmaId });

  useTrackView(
    'rma',
    rma?.id,
    rma?.rmaNumber ?? `RMA ${rmaId.slice(0, 8)}`,
    rma?.status ?? undefined,
    `/support/rmas/${rmaId}`
  );

  const approveMutation = useApproveRma();
  const rejectMutation = useRejectRma();
  const receiveMutation = useReceiveRma();
  const processMutation = useProcessRma();
  const cancelMutation = useCancelRma();

  const handleApprove = async (notes?: string) => {
    try {
      await approveMutation.mutateAsync({ rmaId, notes: notes ?? null });
      toastSuccess('RMA approved successfully');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to approve RMA');
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectMutation.mutateAsync({ rmaId, rejectionReason: reason });
      toastSuccess('RMA rejected');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to reject RMA');
    }
  };

  const handleReceive = async (inspectionNotes?: { condition?: string; notes?: string }) => {
    try {
      const parsed = inspectionNotes
        ? rmaInspectionNotesSchema
            .pick({ condition: true, notes: true })
            .safeParse(inspectionNotes)
        : { success: false as const, data: undefined };
      const result = await receiveMutation.mutateAsync({
        rmaId,
        inspectionNotes: parsed.success ? parsed.data : undefined,
      });
      const units = result.unitsRestored ?? 0;
      toastSuccess(
        units > 0
          ? `RMA received. ${units} unit${units !== 1 ? 's' : ''} returned to inventory.`
          : 'RMA marked as received'
      );
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to mark RMA as received');
    }
  };

  const handleProcess = async (
    resolution: RmaResolution,
    details?: { refundAmount?: number; notes?: string }
  ) => {
    try {
      await processMutation.mutateAsync({
        rmaId,
        resolution,
        resolutionDetails: details,
      });
      toastSuccess('RMA processed successfully');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to process RMA');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: rmaId });
      toastSuccess('RMA cancelled successfully');
      navigate({ to: '/support/rmas' });
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to cancel RMA');
    }
  };

  const handleCancelClick = async () => {
    const { confirmed } = await confirm(
      rma ? confirmations.cancelRma(rma.rmaNumber) : confirmations.irreversible('Cancel RMA')
    );
    if (!confirmed) return;
    await handleCancel();
  };

  const isPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    receiveMutation.isPending ||
    processMutation.isPending ||
    cancelMutation.isPending;

  return {
    rma,
    isLoading,
    error: error instanceof Error ? error : null,
    onRetry: refetch,
    isPending,
    onApprove: handleApprove,
    onReject: handleReject,
    onReceive: handleReceive,
    onProcess: handleProcess,
    onCancel: handleCancelClick,
    isCancelPending: cancelMutation.isPending,
  };
}
