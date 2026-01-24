/**
 * Approvals Index Route
 *
 * Approval dashboard showing pending purchase orders requiring approval.
 * Following the fulfillment dashboard pattern with kanban-style workflow.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { ApprovalDashboard, type ApprovalItem, type ApprovalFilters } from '@/components/domain/approvals/approval-dashboard';
import { queryKeys } from '@/lib/query-keys';

// ============================================================================
// ROUTE DEFINITION
// ============================================================================

export const Route = createFileRoute('/_authenticated/approvals/')({
  component: ApprovalsPage,
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

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  // Mock data - will be replaced with real API calls
  const { data: approvalItems = [], isLoading, error } = useQuery({
    queryKey: queryKeys.approvals.items(activeTab, filters),
    queryFn: async () => {
      // Mock approval items
      return [
        {
          id: 'po-001',
          type: 'purchase_order',
          title: 'Office Supplies Order',
          description: 'Monthly office supplies procurement',
          amount: 2500.0,
          currency: 'AUD',
          requester: 'Sarah Johnson',
          submittedAt: '2024-01-15T10:30:00Z',
          priority: 'medium' as const,
          dueDate: '2024-01-20T17:00:00Z',
          status: 'pending' as const,
          supplierName: 'Office Depot',
          poNumber: 'PO-2024-001',
        },
        {
          id: 'po-002',
          type: 'purchase_order',
          title: 'IT Equipment Purchase',
          description: 'New laptops and monitors for development team',
          amount: 15000.0,
          currency: 'AUD',
          requester: 'Mike Chen',
          submittedAt: '2024-01-14T14:15:00Z',
          priority: 'high' as const,
          dueDate: '2024-01-18T17:00:00Z',
          status: 'pending' as const,
          supplierName: 'TechCorp Solutions',
          poNumber: 'PO-2024-002',
        },
      ] as ApprovalItem[];
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
  }, [queryClient]);

  const handleDecision = useCallback((decision: string, comments: string) => {
    // Handle decision
    console.log('Decision:', decision, 'Comments:', comments);
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
  }, [queryClient]);

  const handleBulkDecision = useCallback((decision: string, comments: string) => {
    // Handle bulk decision
    console.log('Bulk decision:', decision, 'Comments:', comments);
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
  }, [queryClient]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageLayout>
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
