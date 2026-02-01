/**
 * ApprovalDashboard Component
 *
 * Dashboard for reviewing and approving purchase orders and amendments.
 * Following the fulfillment dashboard pattern with queue-based workflow.
 *
 * @see _Initiation/_prd/2-domains/suppliers/suppliers.prd.json (SUPP-APPROVAL-WORKFLOW)
 */
import { memo, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrgFormat } from '@/hooks/use-org-format';
import { ApprovalDecisionDialog } from './approval-decision-dialog';
import { BulkApprovalDialog } from './bulk-approval-dialog';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalItem {
  id: string;
  type: 'purchase_order' | 'amendment';
  title: string;
  description: string;
  amount: number;
  currency: string;
  requester: string;
  submittedAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  supplierName?: string;
  poNumber?: string;
}

export interface ApprovalFilters {
  type: string;
  priority: string;
  search: string;
}

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
  onDecision: (decision: string, comments: string) => void;
  /** @source bulk approval decision handler in /approvals/index.tsx */
  onBulkDecision: (decision: string, comments: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
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
}: ApprovalDashboardProps) {
  // ============================================================================
  // LOCAL UI STATE
  // ============================================================================
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const { formatCurrency } = useOrgFormat();

  // Filter items based on active tab and filters
  const filteredItems = approvalItems.filter((item) => {
    if (activeTab === 'pending' && item.status !== 'pending') return false;
    if (activeTab === 'approved' && item.status !== 'approved') return false;
    if (activeTab === 'rejected' && item.status !== 'rejected') return false;

    if (filters.type !== 'all' && item.type !== filters.type) return false;
    if (filters.priority !== 'all' && item.priority !== filters.priority) return false;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.requester.toLowerCase().includes(searchLower) ||
        (item.supplierName && item.supplierName.toLowerCase().includes(searchLower)) ||
        (item.poNumber && item.poNumber.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

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
        setSelectedItems(filteredItems.map((item) => item.id));
      } else {
        setSelectedItems([]);
      }
    },
    [filteredItems]
  );

  // Handle decision dialog
  const handleDecisionClick = useCallback((item: ApprovalItem) => {
    setSelectedItem(item);
    setDecisionDialogOpen(true);
  }, []);

  // Handle bulk approval
  const handleBulkApproval = useCallback(() => {
    setBulkDialogOpen(true);
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render priority badge
  const renderPriorityBadge = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
    return (
      <Badge variant="secondary" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  // Calculate stats
  const stats = {
    pending: approvalItems.filter((item) => item.status === 'pending').length,
    approved: approvalItems.filter((item) => item.status === 'approved').length,
    rejected: approvalItems.filter((item) => item.status === 'rejected').length,
    urgent: approvalItems.filter((item) => item.priority === 'urgent' && item.status === 'pending')
      .length,
  };

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
      <Card>
        <CardContent className="p-12 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="mb-2 font-medium">Failed to load approvals</p>
          <p className="text-muted-foreground mb-4 text-sm">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={onRefresh}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER UI
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-muted-foreground text-xs">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-muted-foreground text-xs">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-muted-foreground text-xs">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertTriangle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.urgent}</div>
            <p className="text-muted-foreground text-xs">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-1 flex-col gap-4 sm:flex-row">
              {/* Search */}
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search approvals..."
                  value={filters.search}
                  onChange={(e) => onFiltersChange((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-9 sm:w-80"
                />
              </div>

              {/* Type Filter */}
              <Select
                value={filters.type}
                onValueChange={(value) => onFiltersChange((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="amendment">Amendments</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select
                value={filters.priority}
                onValueChange={(value) => onFiltersChange((prev) => ({ ...prev, priority: value }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={onActiveTabChange}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Bulk Actions */}
          {activeTab === 'pending' && selectedItems.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground text-sm">
                    {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selected
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedItems([])}>
                      Clear Selection
                    </Button>
                    <Button onClick={handleBulkApproval}>Bulk Approve</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {activeTab === 'pending' && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedItems.length === filteredItems.length &&
                            filteredItems.length > 0
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded"
                        />
                      </TableHead>
                    )}
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
                    {activeTab === 'pending' && <TableHead>Due</TableHead>}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      {activeTab === 'pending' && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                            className="rounded"
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">
                          {item.type === 'purchase_order' ? 'PO' : 'Amendment'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-muted-foreground text-sm">{item.description}</div>
                          {item.poNumber && (
                            <div className="text-muted-foreground font-mono text-sm">
                              {item.poNumber}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.requester}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.amount, {
                          currency: item.currency,
                          cents: false,
                          showCents: true,
                        })}
                      </TableCell>
                      <TableCell>{renderPriorityBadge(item.priority)}</TableCell>
                      <TableCell>{formatDate(item.submittedAt)}</TableCell>
                      {activeTab === 'pending' && (
                        <TableCell>{item.dueDate ? formatDate(item.dueDate) : '-'}</TableCell>
                      )}
                      <TableCell>
                        {activeTab === 'pending' && (
                          <Button size="sm" onClick={() => handleDecisionClick(item)}>
                            Review
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredItems.length === 0 && (
                <div className="py-12 text-center">
                  <Clock className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">
                    {activeTab === 'pending' ? 'No pending approvals' : `No ${activeTab} items`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Dialog */}
      <ApprovalDecisionDialog
        open={decisionDialogOpen}
        onOpenChange={setDecisionDialogOpen}
        item={selectedItem}
        onDecision={(decision, comments) => {
          onDecision(decision, comments);
          setDecisionDialogOpen(false);
          setSelectedItem(null);
        }}
      />

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedItems={selectedItems}
        onBulkDecision={(decision, comments) => {
          onBulkDecision(decision, comments);
          setBulkDialogOpen(false);
          setSelectedItems([]);
        }}
      />
    </div>
  );
});
