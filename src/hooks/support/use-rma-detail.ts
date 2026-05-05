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
import {
  useRma,
  useApproveRma,
  useRejectRma,
  useReceiveRma,
  useProcessRma,
  useCancelRma,
} from './use-rma';
import { formatSupportMutationError } from './_mutation-errors';
import { useTrackView } from '@/hooks/search';
import { useConfirmation, confirmations } from '@/hooks/_shared/use-confirmation';
import { toast } from '@/hooks/_shared/use-toast';
import {
  rmaInspectionNotesSchema,
  type ProcessRmaPayload,
} from '@/lib/schemas/support/rma';

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
  onReceive: (inspection?: { condition?: string; notes?: string; locationId?: string }) => Promise<void>;
  /** Execute remedy for an RMA (received → processed when successful) */
  onProcess: (input: ProcessRmaPayload) => Promise<void>;
  /** Cancel RMA (requested/approved → cancelled) */
  onCancel: () => Promise<void>;
  /** Cancel mutation pending state */
  isCancelPending: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

const RMA_MUTATION_CODE_MESSAGES: Record<string, string> = {
  transition_blocked:
    'This RMA cannot move to that status. Refresh and review the current RMA state.',
  NOT_FOUND: 'The RMA could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to update this RMA.',
  AUTH_ERROR: 'Your session has expired. Sign in again before updating this RMA.',
  RATE_LIMIT: 'Too many RMA updates were attempted. Wait a moment and retry.',
};

function formatRmaMutationError(error: unknown, fallback: string): string {
  return formatSupportMutationError(error, fallback, {
    codeMessages: RMA_MUTATION_CODE_MESSAGES,
  });
}

function formatRmaExecutionBlockedFeedback(blockedReason: string | null | undefined): string {
  return formatRmaMutationError(
    {
      statusCode: 400,
      errors: {
        executionBlockedReason: [blockedReason ?? 'RMA execution is blocked'],
      },
    },
    'RMA execution is blocked'
  );
}

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
      toast.success('RMA approved successfully');
    } catch (err) {
      toast.error(formatRmaMutationError(err, 'Failed to approve RMA'));
      throw err;
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectMutation.mutateAsync({ rmaId, rejectionReason: reason });
      toast.success('RMA rejected');
    } catch (err) {
      toast.error(formatRmaMutationError(err, 'Failed to reject RMA'));
      throw err;
    }
  };

  const handleReceive = async (inspection?: { condition?: string; notes?: string; locationId?: string }) => {
    try {
      const parsed = inspection
        ? rmaInspectionNotesSchema
            .pick({ condition: true, notes: true })
            .safeParse(inspection)
        : { success: false as const, data: undefined };
      if (!inspection?.locationId) {
        toast.error('Receiving location is required');
        return;
      }
      const result = await receiveMutation.mutateAsync({
        rmaId,
        locationId: inspection.locationId,
        inspectionNotes: parsed.success ? parsed.data : undefined,
      });
      const units = result.unitsRestored ?? 0;
      toast.success(
        units > 0
          ? `RMA received. ${units} unit${units !== 1 ? 's' : ''} returned to inventory.`
          : 'RMA marked as received'
      );
    } catch (err) {
      toast.error(formatRmaMutationError(err, 'Failed to mark RMA as received'));
      throw err;
    }
  };

  const handleProcess = async (input: ProcessRmaPayload) => {
    try {
      const result = await processMutation.mutateAsync({
        rmaId,
        ...input,
      });
      if (result.execution?.status === 'blocked') {
        toast.error(formatRmaExecutionBlockedFeedback(result.execution.blockedReason));
        throw new Error('RMA execution is blocked');
      }
      toast.success('RMA remedy completed successfully');
    } catch (err) {
      if (!(err instanceof Error && err.message === 'RMA execution is blocked')) {
        toast.error(formatRmaMutationError(err, 'Failed to execute remedy'));
      }
      throw err;
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: rmaId });
      toast.success('RMA cancelled successfully');
      navigate({ to: '/support/rmas' });
    } catch (err) {
      toast.error(formatRmaMutationError(err, 'Failed to cancel RMA'));
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
