/**
 * ApprovalDashboard Component
 *
 * Dashboard for reviewing and approving purchase orders and amendments.
 * Following the fulfillment dashboard pattern with queue-based workflow.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { memo, useState, useCallback, useMemo } from 'react';
import { Clock, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState, EmptyStateContainer } from '@/components/shared/empty-state';
import { ApprovalDecisionDialog } from './approval-decision-dialog';
import { BulkApprovalDialog } from './bulk-approval-dialog';
import { ApprovalStatsCards, type ApprovalStats } from './approval-stats-cards';
import { ApprovalTable } from './approval-table';
import { ApprovalBulkActions } from './approval-bulk-actions';
import { FilterEmptyState } from '@/components/shared/filter-empty-state';
import { DomainFilterBar } from '@/components/shared/filters/domain-filter-bar';
import { buildFilterItems } from '@/components/shared/filters/build-filter-items';
import type { FilterBarConfig } from '@/components/shared/filters/types';

// ============================================================================
// TYPES
// ============================================================================

// Import types from schemas (single source of truth per SCHEMA-TRACE.md)
import type { ApprovalItem, ApprovalFilters } from '@/lib/schemas/approvals';

// Re-export for backward compatibility
export type { ApprovalItem, ApprovalFilters };

export interface ApprovalDashboardProps {
  /** @source useQuery(['approval-items']) in /approvals/index.tsx */
  approvalItems: ApprovalItem[];
  /** @source useQuery loading state in /approvals/index.tsx */
  isLoading: boolean;
  /** @source useQuery error state in /approvals/index.tsx */
  error?: unknown;
  /** @source useState(activeTab) in /approvals/index.tsx */
  activeTab: string;
  /** @source setState from useState(activeTab) in /approvals/index.tsx */
  onActiveTabChange: (tab: string) => void;
  /** @source useState(filters) in /approvals/index.tsx */
  filters: ApprovalFilters;
  /** @source setState from useState(filters) in /approvals/index.tsx */
  onFiltersChange: (filters: ApprovalFilters | ((prev: ApprovalFilters) => ApprovalFilters)) => void;
  /** @source queryClient.invalidateQueries handler in /approvals/index.tsx */
  onRefresh: () => void;
  /** @source approval decision handler in /approvals/index.tsx */
  onDecision: (
    decision: 'approve' | 'reject' | 'escalate',
    data: { comments: string; escalateTo?: string }
  ) => void;
  /** @source bulk approval decision handler in /approvals/index.tsx */
  onBulkDecision: (decision: string, comments: string, selectedIds: string[]) => void;
  /** @source useUsers in /approvals/index.tsx */
  escalationUsers: Array<{ id: string; name: string | null; email: string | null }>;
  /** @source useState(selectedItem) in /approvals/index.tsx */
  selectedItem: ApprovalItem | null;
  /** @source setState from useState(selectedItem) in /approvals/index.tsx */
  onSelectedItemChange: (item: ApprovalItem | null) => void;
  /** @source useApprovalDetails hook in /approvals/index.tsx */
  approvalDetails?: { items?: Array<{ id: string; productName: string; productSku?: string; quantity: number; unitPrice: number | null; lineTotal: number | null }> };
  /** @source useApprovalDetails loading state in /approvals/index.tsx */
  isLoadingApprovalDetails?: boolean;
  /** @source useState(decisionDialogOpen) in /approvals/index.tsx */
  decisionDialogOpen: boolean;
  /** @source setState from useState(decisionDialogOpen) in /approvals/index.tsx */
  onDecisionDialogOpenChange: (open: boolean) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const APPROVAL_TABS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// ============================================================================
// FILTER CONFIG
// ============================================================================

const APPROVAL_FILTER_CONFIG: FilterBarConfig<ApprovalFilters> = {
  search: {
    placeholder: 'Search approvals...',
    fields: ['poNumber', 'supplierName', 'requester'],
  },
  filters: [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'purchase_order', label: 'Purchase Orders' },
        { value: 'amendment', label: 'Amendments' },
      ],
      primary: true,
      allLabel: 'All Types',
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'all', label: 'All Priorities' },
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
      primary: true,
      allLabel: 'All Priorities',
    },
  ],
  labels: {
    type: 'Type',
    priority: 'Priority',
  },
};

const DEFAULT_APPROVAL_FILTERS: ApprovalFilters = {
  type: 'all',
  priority: 'all',
  search: '',
};

// ============================================================================
// COMPONENT
// ============================================================================

export const ApprovalDashboard = memo(function ApprovalDashboard({
  approvalItems,
  isLoading,
  error,
  activeTab,
  onActiveTabChange,
  filters,
  onFiltersChange,
  onRefresh,
  onDecision,
  onBulkDecision,
  escalationUsers,
  selectedItem,
  onSelectedItemChange,
  approvalDetails,
  isLoadingApprovalDetails,
  decisionDialogOpen,
  onDecisionDialogOpenChange,
}: ApprovalDashboardProps) {
  // ============================================================================
  // LOCAL UI STATE
  // ============================================================================
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
    if (selected) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedItems(approvalItems.map((item) => item.id));
      } else {
        setSelectedItems([]);
      }
    },
    [approvalItems]
  );

  // Handle decision dialog
  const handleDecisionClick = useCallback((item: ApprovalItem) => {
    onSelectedItemChange(item);
    onDecisionDialogOpenChange(true);
  }, [onSelectedItemChange, onDecisionDialogOpenChange]);

  // Handle bulk approval
  const handleBulkApproval = useCallback(() => {
    if (selectedItems.length > 0) {
      setBulkDialogOpen(true);
    }
  }, [selectedItems.length]);

  // Memoize stats calculation
  const stats = useMemo<ApprovalStats>(() => ({
    pending: approvalItems.filter((item) => item.status === 'pending').length,
    approved: approvalItems.filter((item) => item.status === 'approved').length,
    rejected: approvalItems.filter((item) => item.status === 'rejected').length,
    urgent: approvalItems.filter((item) => item.priority === 'urgent' && item.status === 'pending')
      .length,
  }), [approvalItems]);

  // Check if filters are active (excluding search and tab)
  const hasActiveFilters = useMemo(() => {
    return filters.type !== 'all' || filters.priority !== 'all' || (filters.search?.trim() ?? '') !== '';
  }, [filters.type, filters.priority, filters.search]);

  // Build filter items for FilterEmptyState
  const filterItems = useMemo(() => {
    if (!hasActiveFilters) return [];
    return buildFilterItems({
      filters,
      config: APPROVAL_FILTER_CONFIG,
      defaultFilters: DEFAULT_APPROVAL_FILTERS,
      onFiltersChange: onFiltersChange,
      excludeKeys: ['search'],
    });
  }, [filters, hasActiveFilters, onFiltersChange]);

  // Handler to clear all filters
  const handleClearFilters = useCallback(() => {
    onFiltersChange(DEFAULT_APPROVAL_FILTERS);
  }, [onFiltersChange]);


  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-12 animate-pulse rounded bg-gray-200" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="text-muted-foreground mx-auto mb-4 h-12 w-12 animate-spin" />
            <p className="text-muted-foreground">Loading approvals...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  if (error) {
    return (
      <EmptyStateContainer variant="page">
        <EmptyState
          icon={XCircle}
          title="Failed to load approvals"
          message={error instanceof Error ? error.message : 'An unexpected error occurred'}
          primaryAction={{
            label: 'Try Again',
            onClick: onRefresh,
          }}
        />
      </EmptyStateContainer>
    );
  }

  // ============================================================================
  // RENDER UI
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <ApprovalStatsCards stats={stats} />

      {/* Filters (includes FilterChipsBar dropdown when showChips) */}
      <DomainFilterBar<ApprovalFilters>
        config={APPROVAL_FILTER_CONFIG}
        filters={filters}
        onFiltersChange={onFiltersChange}
        defaultFilters={DEFAULT_APPROVAL_FILTERS}
        resultCount={approvalItems.length}
      />

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={onRefresh}
          size="sm"
          className="transition-colors"
          aria-label="Refresh approvals list"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={onActiveTabChange}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Bulk Actions - Always visible for better discoverability */}
          {activeTab === APPROVAL_TABS.PENDING && (
            <ApprovalBulkActions
              selectedCount={selectedItems.length}
              onClearSelection={() => setSelectedItems([])}
              onBulkApprove={handleBulkApproval}
            />
          )}

          {/* Items Table */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <ApprovalTable
                items={approvalItems}
                activeTab={activeTab}
                selectedItems={selectedItems}
                onItemSelect={handleItemSelect}
                onSelectAll={handleSelectAll}
                onDecisionClick={handleDecisionClick}
              />

              {approvalItems.length === 0 && (
                <EmptyStateContainer variant="inline">
                  {hasActiveFilters && filterItems.length > 0 ? (
                    <FilterEmptyState
                      entityName="approvals"
                      filters={filterItems}
                      onClearAll={handleClearFilters}
                    />
                  ) : (
                    <EmptyState
                      icon={Clock}
                      title={activeTab === APPROVAL_TABS.PENDING ? 'No pending approvals' : `No ${activeTab} items`}
                      message={
                        activeTab === APPROVAL_TABS.PENDING
                          ? 'All approvals have been processed. New approvals will appear here when ready.'
                          : `No ${activeTab} approvals found.`
                      }
                    />
                  )}
                </EmptyStateContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Dialog */}
      <ApprovalDecisionDialog
        open={decisionDialogOpen}
        onOpenChange={(open) => {
          onDecisionDialogOpenChange(open);
          if (!open) {
            onSelectedItemChange(null);
          }
        }}
        item={selectedItem}
        escalationUsers={escalationUsers}
        approvalDetails={approvalDetails}
        isLoadingApprovalDetails={isLoadingApprovalDetails}
        onDecision={(decision, data) => {
          onDecision(decision, data);
          onDecisionDialogOpenChange(false);
          onSelectedItemChange(null);
        }}
      />

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedItems={selectedItems}
        onBulkDecision={(decision, comments) => {
          onBulkDecision(decision, comments, selectedItems);
          setBulkDialogOpen(false);
          setSelectedItems([]);
        }}
      />
    </div>
  );
});
