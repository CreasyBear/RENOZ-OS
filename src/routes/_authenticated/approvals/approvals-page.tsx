/**
 * Approvals Page Component
 *
 * Approval dashboard showing pending purchase orders requiring approval.
 * Following the fulfillment dashboard pattern with kanban-style workflow.
 *
 * @source approvals from usePendingApprovals hook
 * @source approveMutation from useApproveItem hook
 * @source rejectMutation from useRejectItem hook
 * @source bulkApproveMutation from useBulkApprove hook
 *
 * @see src/routes/_authenticated/approvals/index.tsx - Route definition
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout';
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
  useEscalateApproval,
  useApprovalDetails,
} from '@/hooks/suppliers';
import { useUsers } from '@/hooks/users';
import type { ApprovalRejectionReason, ApprovalStatus } from '@/lib/schemas/approvals';
import { determinePriority } from '@/lib/utils/approvals';
import { Route } from './index';
import { APPROVAL_TABS } from '@/components/domain/approvals/approval-dashboard';

// ============================================================================
// CONSTANTS
// ============================================================================

const APPROVAL_TABS_WITH_ALL = {
  ...APPROVAL_TABS,
  ALL: 'all',
} as const;

// Map tab to status using schema enum for type safety
const TAB_STATUS_MAP: Record<string, ApprovalStatus | undefined> = {
  [APPROVAL_TABS.PENDING]: 'pending',
  [APPROVAL_TABS.APPROVED]: 'approved',
  [APPROVAL_TABS.REJECTED]: 'rejected',
  [APPROVAL_TABS_WITH_ALL.ALL]: undefined,
};

export default function ApprovalsPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const activeTab = search.tab ?? APPROVAL_TABS_WITH_ALL.PENDING;
  
  // Memoize filters with stable reference - only recreate when search values actually change
  const filters = useMemo<ApprovalFilters>(() => {
    return {
      type: search.type ?? 'all',
      priority: search.priority ?? 'all',
      search: search.search ?? '',
    };
  }, [search.type, search.priority, search.search]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data, isLoading, error } = usePendingApprovals({
    status: TAB_STATUS_MAP[activeTab],
    search: filters.search || undefined,
    type: filters.type !== 'all' ? (filters.type as 'purchase_order' | 'amendment') : undefined,
    priority: filters.priority !== 'all' ? (filters.priority as 'low' | 'medium' | 'high' | 'urgent') : undefined,
  });
  const { data: usersData } = useUsers({
    page: 1,
    pageSize: 100,
    status: 'active',
    sortOrder: 'asc',
  });

  // Track dialog open state for conditional fetching
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);

  // Fetch approval details when item is selected AND dialog is open
  const approvalId = selectedItem?.id ?? '';
  const { data: approvalDetails, isLoading: isLoadingDetails } = useApprovalDetails(approvalId, {
    enabled: !!approvalId && decisionDialogOpen,
  });

  // Transform server data to ApprovalItem format
  const approvalItems = (data?.items ?? []).map((item) => ({
    id: item.id,
    type: 'purchase_order' as const,
    title: item.poNumber || 'Purchase Order',
    description: `Level ${item.level} approval`,
    amount: Number(item.totalAmount) || 0,
    currency: item.currency || 'AUD',
    requester: item.requesterName || item.requesterEmail || 'Unknown User',
    submittedAt: item.createdAt?.toISOString() || new Date().toISOString(),
    priority: determinePriority(item.dueAt),
    dueDate: item.dueAt?.toISOString(),
    status: item.status as 'pending' | 'approved' | 'rejected' | 'escalated',
    supplierName: item.supplierName || undefined,
    poNumber: item.poNumber || undefined,
    level: item.level ?? undefined,
    escalatedTo: item.escalatedTo ?? undefined,
  }));

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const approveMutation = useApproveItem();
  const rejectMutation = useRejectItem();
  const bulkApproveMutation = useBulkApprove();
  const escalateMutation = useEscalateApproval();
  const handleActiveTabChange = useCallback(
    (tab: string) => {
      // Route schema allows tab: 'pending' | 'approved' | 'rejected' only; map 'all' to undefined
      const validTab =
        tab === 'all' ? undefined : (tab as 'pending' | 'approved' | 'rejected');
      navigate({
        to: '/approvals',
        search: (prev) => ({ ...prev, tab: validTab }),
        replace: true,
      });
    },
    [navigate]
  );

  const handleFiltersChange = useCallback(
    (next: ApprovalFilters | ((prev: ApprovalFilters) => ApprovalFilters)) => {
      const nextFilters = typeof next === 'function' ? next(filters) : next;
      navigate({
        search: (prev) => ({
          ...prev,
          type: nextFilters.type as 'all' | 'purchase_order' | 'amendment',
          priority: nextFilters.priority as 'all' | 'low' | 'medium' | 'high' | 'urgent',
          search: nextFilters.search || undefined,
        }),
        replace: true,
      });
    },
    [filters, navigate]
  );


  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
  }, [queryClient]);

  const handleDecision = useCallback(
    async (
      decision: 'approve' | 'reject' | 'escalate',
      data: { comments: string; escalateTo?: string }
    ) => {
      if (!selectedItem) return;

      try {
        if (decision === 'approve') {
          await approveMutation.mutateAsync({
            approvalId: selectedItem.id,
            comments: data.comments,
          });
          toast.success('Approval submitted', {
            description: `${selectedItem.poNumber || 'Item'} has been approved`,
          });
        } else if (decision === 'reject') {
          await rejectMutation.mutateAsync({
            approvalId: selectedItem.id,
            reason: 'other' as ApprovalRejectionReason,
            comments: data.comments,
          });
          toast.success('Rejection submitted', {
            description: `${selectedItem.poNumber || 'Item'} has been rejected`,
          });
        } else if (decision === 'escalate') {
          if (!data.escalateTo || !data.comments) {
            throw new Error('Escalation requires a user and reason');
          }
          await escalateMutation.mutateAsync({
            approvalId: selectedItem.id,
            escalateTo: data.escalateTo,
            reason: data.comments,
          });
          toast.success('Approval escalated', {
            description: `${selectedItem.poNumber || 'Item'} has been escalated`,
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
    [selectedItem, approveMutation, rejectMutation, escalateMutation, queryClient]
  );

  const handleBulkDecision = useCallback(
    async (decision: string, comments: string, selectedIds: string[]) => {
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
    [bulkApproveMutation, queryClient]
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
          onActiveTabChange={handleActiveTabChange}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
          onDecision={handleDecision}
          onBulkDecision={handleBulkDecision}
          escalationUsers={usersData?.items ?? []}
          selectedItem={selectedItem}
          onSelectedItemChange={setSelectedItem}
          approvalDetails={approvalDetails ? {
            items: approvalDetails.items?.map(item => ({
              id: item.id,
              productName: item.productName,
              productSku: item.productSku ?? undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            }))
          } : undefined}
          isLoadingApprovalDetails={isLoadingDetails}
          decisionDialogOpen={decisionDialogOpen}
          onDecisionDialogOpenChange={setDecisionDialogOpen}
        />
      </PageLayout.Content>
    </PageLayout>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

