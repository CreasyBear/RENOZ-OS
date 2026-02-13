/**
 * RMA Detail Page
 *
 * Displays RMA details with workflow actions (approve, reject, receive, process).
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 * @see src/components/domain/support/rma-detail-view.tsx
 */
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { DetailPageBackButton } from '@/components/layout/detail-page-back-button';
import { toast } from 'sonner';

import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { RmaDetailView } from '@/components/domain/support';
import {
  useRma,
  useApproveRma,
  useRejectRma,
  useReceiveRma,
  useProcessRma,
  useCancelRma,
} from '@/hooks/support';
import { useTrackView } from '@/hooks/search';
import { useConfirmation, confirmations } from '@/hooks/_shared/use-confirmation';
import { rmaInspectionNotesSchema, type RmaResolution } from '@/lib/schemas/support/rma';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/rmas/$rmaId')({
  component: RmaDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/rmas" />
  ),
  pendingComponent: () => (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="RMA Details"
        description="View and manage return authorization"
      />
      <PageLayout.Content>
        <SupportDetailSkeleton />
      </PageLayout.Content>
    </PageLayout>
  ),
});

// ============================================================================
// COMPONENT
// ============================================================================

function RmaDetailPage() {
  const { rmaId } = Route.useParams();
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
    } catch {
      toast.error('Failed to approve RMA');
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await rejectMutation.mutateAsync({ rmaId, rejectionReason: reason });
      toast.success('RMA rejected');
    } catch {
      toast.error('Failed to reject RMA');
    }
  };

  const handleReceive = async (inspectionNotes?: { condition?: string; notes?: string }) => {
    try {
      const parsed = inspectionNotes
        ? rmaInspectionNotesSchema
            .pick({ condition: true, notes: true })
            .safeParse(inspectionNotes)
        : { success: false as const, data: undefined };
      await receiveMutation.mutateAsync({
        rmaId,
        inspectionNotes: parsed.success ? parsed.data : undefined,
      });
      toast.success('RMA marked as received');
    } catch {
      toast.error('Failed to mark RMA as received');
    }
  };

  const handleProcess = async (resolution: RmaResolution, details?: { refundAmount?: number; notes?: string }) => {
    try {
      await processMutation.mutateAsync({
        rmaId,
        resolution,
        resolutionDetails: details,
      });
      toast.success('RMA processed successfully');
    } catch {
      toast.error('Failed to process RMA');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: rmaId });
      toast.success('RMA cancelled successfully');
      navigate({ to: '/support/rmas' });
    } catch {
      toast.error('Failed to cancel RMA');
    }
  };

  const handleCancelClick = async () => {
    const { confirmed } = await confirm(
      rma ? confirmations.cancelRma(rma.rmaNumber) : confirmations.irreversible('Cancel RMA'),
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

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title={null}
        leading={<DetailPageBackButton to="/support/rmas" aria-label="Back to RMAs" />}
        actions={null}
      />
      <PageLayout.Content>
        <RmaDetailView
          rma={rma}
          isLoading={isLoading}
          error={error instanceof Error ? error : null}
          onRetry={refetch}
          isPending={isPending}
          onApprove={handleApprove}
          onReject={handleReject}
          onReceive={handleReceive}
          onProcess={handleProcess}
          onCancel={handleCancelClick}
          isCancelPending={cancelMutation.isPending}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}
