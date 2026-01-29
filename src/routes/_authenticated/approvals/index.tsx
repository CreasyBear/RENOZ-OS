/**
 * Approvals Index Route
 *
 * Approval dashboard showing pending purchase orders requiring approval.
 * Following the fulfillment dashboard pattern with kanban-style workflow.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RouteErrorFallback, PageLayout } from '@/components/layout';
import { AdminTableSkeleton } from '@/components/skeletons/admin';
import {
  ApprovalDashboard,
  type ApprovalItem,
  type ApprovalFilters,
} from '@/components/domain/approvals/approval-dashboard';
import { queryKeys } from '@/lib/query-keys';
import {
  usePendingApprovals,
  useApproveItem,
  useRejectItem,
  useBulkApprove,
} from '@/hooks/suppliers';
import type { ApprovalRejectionReason } from '@/lib/schemas/approvals';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/approvals/')({
  component: ApprovalsPage,
  errorComponent: ({ error }) => (
    <RouteErrorFallback error={error} parentRoute="/" />
  ),
  pendingComponent: () => <AdminTableSkeleton />,
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [filters, setFilters] = useState<ApprovalFilters>({
    type: 'all',
    priority: 'all',
    search: '',
  });
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const statusMap: Record<string, 'pending' | 'approved' | 'rejected' | 'escalated' | undefined> = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
    all: undefined,
  };

  const { data, isLoading, error } = usePendingApprovals({
    status: statusMap[activeTab],
    search: filters.search || undefined,
  });

  // Transform server data to ApprovalItem format
  const approvalItems = useMemo((): ApprovalItem[] => {
    if (!data?.items) return [];

    return data.items.map((item) => ({
      id: item.id,
      type: 'purchase_order' as const,
      title: item.poNumber || 'Purchase Order',
      description: `Level ${item.level} approval`,
      amount: Number(item.totalAmount) || 0,
      currency: item.currency || 'AUD',
      requester: 'Requester', // Would come from submitter info
      submittedAt: item.createdAt?.toISOString() || new Date().toISOString(),
      priority: determinePriority(item.dueAt),
      dueDate: item.dueAt?.toISOString(),
      status: item.status as 'pending' | 'approved' | 'rejected' | 'escalated',
      supplierName: undefined, // Would come from supplier join
      poNumber: item.poNumber || undefined,
    }));
  }, [data?.items]);

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const approveMutation = useApproveItem();
  const rejectMutation = useRejectItem();
  const bulkApproveMutation = useBulkApprove();

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
  }, [queryClient]);

  const handleDecision = useCallback(
    async (decision: string, comments: string) => {
      if (!selectedItem) return;

      try {
        if (decision === 'approve') {
          await approveMutation.mutateAsync({
            approvalId: selectedItem.id,
            comments,
          });
          toast.success('Approval submitted', {
            description: `${selectedItem.poNumber || 'Item'} has been approved`,
          });
        } else if (decision === 'reject') {
          await rejectMutation.mutateAsync({
            approvalId: selectedItem.id,
            reason: 'other' as ApprovalRejectionReason,
            comments,
          });
          toast.success('Rejection submitted', {
            description: `${selectedItem.poNumber || 'Item'} has been rejected`,
          });
        }

        setSelectedItem(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      } catch (err) {
        toast.error('Decision failed', {
          description: err instanceof Error ? err.message : 'An error occurred',
        });
      }
    },
    [selectedItem, approveMutation, rejectMutation, queryClient]
  );

  const handleBulkDecision = useCallback(
    async (decision: string, comments: string) => {
      // Get all selected items from the component (simplified for now)
      const selectedIds = approvalItems
        .filter((item) => item.status === 'pending')
        .map((item) => item.id);

      if (selectedIds.length === 0) {
        toast.warning('No items selected', {
          description: 'Please select items to approve or reject',
        });
        return;
      }

      try {
        if (decision === 'approve') {
          const result = await bulkApproveMutation.mutateAsync({
            approvalIds: selectedIds,
            comments,
          });
          toast.success('Bulk approval complete', {
            description: `${result.approved.length} items approved, ${result.failed.length} failed`,
          });
        }
        // Bulk reject would need a different approach since it requires reasons

        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      } catch (err) {
        toast.error('Bulk operation failed', {
          description: err instanceof Error ? err.message : 'An error occurred',
        });
      }
    },
    [approvalItems, bulkApproveMutation, queryClient]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Approvals"
        description="Review and approve purchase orders, amendments, and other procurement requests"
      />

      <PageLayout.Content>
        <ApprovalDashboard
          approvalItems={approvalItems}
          isLoading={isLoading}
          error={error}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={handleRefresh}
          onDecision={handleDecision}
          onBulkDecision={handleBulkDecision}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determine priority based on due date proximity.
 */
function determinePriority(dueAt: Date | null | undefined): 'low' | 'medium' | 'high' | 'urgent' {
  if (!dueAt) return 'medium';

  const now = new Date();
  const due = new Date(dueAt);
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return 'urgent'; // Overdue
  if (hoursUntilDue < 24) return 'high'; // Due within 24 hours
  if (hoursUntilDue < 72) return 'medium'; // Due within 3 days
  return 'low';
}
