/**
 * RMA Detail Page
 *
 * Displays RMA details with workflow actions (approve, reject, receive, process).
 *
 * @see _Initiation/_prd/2-domains/support/support.prd.json - DOM-SUP-003c
 * @see src/components/domain/support/rma-detail-card.tsx
 */
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, Package } from 'lucide-react';
import { toast } from 'sonner';

import { PageLayout, RouteErrorFallback } from '@/components/layout';
import { SupportDetailSkeleton } from '@/components/skeletons/support';
import { Button } from '@/components/ui/button';
import { RmaDetailCard } from '@/components/domain/support';
import { RmaWorkflowActions } from '@/components/domain/support';
import {
  useRma,
  useApproveRma,
  useRejectRma,
  useReceiveRma,
  useProcessRma,
} from '@/hooks/support';
import type { RmaResolution } from '@/lib/schemas/support/rma';

// ============================================================================
// ROUTE
// ============================================================================

export const Route = createFileRoute('/_authenticated/support/rmas/$rmaId')({
  component: RmaDetailPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/support/rmas" />
  ),
  pendingComponent: () => (
    <PageLayout variant="container">
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

  // Fetch RMA detail
  const { data: rma, isLoading, error, refetch } = useRma({ rmaId });

  // Workflow mutations
  const approveMutation = useApproveRma();
  const rejectMutation = useRejectRma();
  const receiveMutation = useReceiveRma();
  const processMutation = useProcessRma();

  // Workflow handlers
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
      await receiveMutation.mutateAsync({
        rmaId,
        inspectionNotes: inspectionNotes
          ? {
              condition: inspectionNotes.condition as
                | 'good'
                | 'damaged'
                | 'defective'
                | 'missing_parts'
                | undefined,
              notes: inspectionNotes.notes,
            }
          : undefined,
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

  const isPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    receiveMutation.isPending ||
    processMutation.isPending;

  return (
    <PageLayout variant="container">
      <PageLayout.Header
        title={
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            {rma?.rmaNumber ?? 'RMA Details'}
          </div>
        }
        description="View and manage return authorization"
        actions={
          <Link to="/support/rmas">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to RMAs
            </Button>
          </Link>
        }
      />

      <PageLayout.Content>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* RMA Detail Card */}
          <div className="lg:col-span-2">
            <RmaDetailCard
              rma={rma}
              isLoading={isLoading}
              error={error instanceof Error ? error : null}
              onRetry={refetch}
              workflowActions={
                rma && (
                  <RmaWorkflowActions
                    rma={rma}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onReceive={handleReceive}
                    onProcess={handleProcess}
                    isPending={isPending}
                  />
                )
              }
            />
          </div>

          {/* Sidebar with related info */}
          <div className="space-y-4">
            {/* Could add related issue link, customer info, order info here */}
            {rma?.issueId && (
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-medium">Related Issue</h3>
                <Link
                  to="/support/issues/$issueId"
                  params={{ issueId: rma.issueId }}
                  className="text-primary text-sm hover:underline"
                >
                  View Issue →
                </Link>
              </div>
            )}
            {rma?.orderId && (
              <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-medium">Related Order</h3>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: rma.orderId }}
                  className="text-primary text-sm hover:underline"
                >
                  View Order →
                </Link>
              </div>
            )}
          </div>
        </div>
      </PageLayout.Content>
    </PageLayout>
  );
}
