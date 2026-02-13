/**
 * Purchase Orders Page Component
 *
 * Main purchase order list page with search, filtering, and management.
 * Implements SUPP-PO-MANAGEMENT story.
 *
 * @source orders from usePurchaseOrders hook
 * @source deleteMutation from useDeletePurchaseOrder hook
 * @source filters from useTransformedFilterUrlState hook
 *
 * @see src/routes/_authenticated/purchase-orders/index.tsx - Route definition
 */

import { useNavigate, Link } from '@tanstack/react-router';
import { useCallback, useMemo, useState, useRef } from 'react';
import { Plus, ChevronDown, Building2, Package, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/lib/toast';
import {
  PODirectory,
  DEFAULT_PO_FILTERS,
  buildPOQuery,
} from '@/components/domain/purchase-orders';
import {
  purchaseOrderStatusEnum,
  type PurchaseOrderFiltersState,
  type PurchaseOrderStatus,
} from '@/lib/schemas/purchase-orders';
import { ReceivingDialogWrapper } from '@/components/domain/purchase-orders/receive/receiving-dialog-wrapper';
import { BulkReceivingDialogContainer } from '@/components/domain/procurement/receiving/bulk-receiving-dialog-container';
import { BulkActionsBar } from '@/components/shared/data-table';
import { useReceivingDialog } from '@/hooks/purchase-orders/use-receiving-dialog';
import {
  usePurchaseOrders,
  usePurchaseOrderStatusCounts,
  useDeletePurchaseOrder,
  useBulkDeletePurchaseOrders,
} from '@/hooks/suppliers';
import { useBulkReceiveGoods } from '@/hooks/suppliers/use-bulk-receive-goods';
import { useBulkApprove } from '@/hooks/suppliers/use-approvals';
import { getApprovalIdsForPurchaseOrders } from '@/server/functions/suppliers/approvals';
import {
  isPurchaseOrderSortField,
  type PurchaseOrderTableData,
} from '@/lib/schemas/purchase-orders';
import type { BulkReceiptData } from '@/lib/schemas/procurement/procurement-types';
import { useConfirmation } from '@/hooks';
import {
  useTransformedFilterUrlState,
  parseDateFromUrl,
  serializeDateForUrl,
} from '@/hooks/filters/use-filter-url-state';
import type { poSearchSchema } from './index';
import type { z } from 'zod';

type POSearchParams = z.infer<typeof poSearchSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

import { DEFAULT_CURRENCY } from '@/lib/constants/procurement';

/** Transform URL search params to PurchaseOrderFiltersState */
const fromUrlParams = (search: POSearchParams): PurchaseOrderFiltersState => ({
  search: search.search ?? '',
  status: search.status
    ? search.status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((s): s is PurchaseOrderStatus => purchaseOrderStatusEnum.safeParse(s).success)
    : [],
  supplierId: search.supplierId ?? null,
  dateRange: search.dateFrom || search.dateTo
    ? {
        from: parseDateFromUrl(search.dateFrom),
        to: parseDateFromUrl(search.dateTo),
      }
    : null,
  totalRange: search.minTotal !== undefined || search.maxTotal !== undefined
    ? {
        min: search.minTotal ?? null,
        max: search.maxTotal ?? null,
      }
    : null,
  overdue: search.overdue === 'true' || search.overdue === '1',
});

/** Transform PurchaseOrderFiltersState to URL search params */
const toUrlParams = (filters: PurchaseOrderFiltersState): Record<string, unknown> => ({
  search: filters.search || undefined,
  status: filters.status.length > 0 ? filters.status.join(',') : undefined,
  supplierId: filters.supplierId ?? undefined,
  dateFrom: filters.dateRange?.from ? serializeDateForUrl(filters.dateRange.from) : undefined,
  dateTo: filters.dateRange?.to ? serializeDateForUrl(filters.dateRange.to) : undefined,
  minTotal: filters.totalRange?.min ?? undefined,
  maxTotal: filters.totalRange?.max ?? undefined,
  overdue: filters.overdue ? 'true' : undefined,
});

interface PurchaseOrdersPageProps {
  search: POSearchParams;
}

export default function PurchaseOrdersPage({ search }: PurchaseOrdersPageProps) {
  const navigate = useNavigate();
  const confirm = useConfirmation();
  const lastSelectedIndexRef = useRef<number>(-1);

  // Selection state for bulk receive
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReceivingOpen, setBulkReceivingOpen] = useState(false);

  // Receiving dialog state (using custom hook)
  const receivingDialog = useReceivingDialog({
    initialPOId: search.receive ?? null,
    syncWithUrl: true,
  });

  // URL-synced filter state with transformations
  const { filters, setFilters } = useTransformedFilterUrlState({
    currentSearch: search,
    navigate,
    defaults: DEFAULT_PO_FILTERS,
    fromUrlParams,
    toUrlParams,
    resetPageOnChange: ['search', 'status', 'supplierId', 'dateRange', 'totalRange', 'overdue'],
  });

  // Pagination from URL
  const page = search.page;
  const pageSize = search.pageSize;
  const sortBy = search.sortBy;
  const sortOrder = search.sortOrder;

  // Fetch purchase orders and status counts
  const { data: ordersData, isLoading: isLoadingOrders, error: ordersError, refetch } = usePurchaseOrders({
    ...buildPOQuery(filters),
    page,
    pageSize,
    sortBy,
    sortOrder,
  });
  const { data: statusCounts } = usePurchaseOrderStatusCounts();

  // Delete mutation using centralized hook
  const deleteMutation = useDeletePurchaseOrder();
  const bulkReceiveMutation = useBulkReceiveGoods();
  const bulkApproveMutation = useBulkApprove();
  const bulkDeleteMutation = useBulkDeletePurchaseOrders();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: PurchaseOrderFiltersState) => {
    setFilters(newFilters);
  }, [setFilters]);

  const handleSortChange = useCallback(
    (field: string) => {
      const safeField = isPurchaseOrderSortField(field) ? field : search.sortBy;
      const newDirection =
        safeField === search.sortBy && search.sortOrder === 'asc' ? 'desc' : 'asc';
      navigate({
        to: '.',
        search: { ...search, sortBy: safeField, sortOrder: newDirection, page: 1 },
      });
    },
    [navigate, search]
  );

  const handlePageChange = useCallback((newPage: number) => {
    navigate({
      to: '.',
      search: { ...search, page: newPage },
    });
  }, [navigate, search]);

  const handleView = useCallback(
    (id: string) => {
      navigate({ to: '/purchase-orders/$poId', params: { poId: id } });
    },
    [navigate]
  );

  const handleEdit = useCallback(
    (id: string) => {
      navigate({ to: '/purchase-orders/$poId', params: { poId: id } });
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const result = await confirm.confirm({
        title: 'Delete Purchase Order',
        description:
          'Are you sure you want to delete this purchase order? This action cannot be undone.',
        confirmLabel: 'Delete',
        variant: 'destructive',
      });

      if (result.confirmed) {
        deleteMutation.mutate(
          { id },
          {
            onSuccess: () => {
              toast.success('Purchase order deleted successfully');
            },
            onError: (error) => {
              toast.error(
                error instanceof Error ? error.message : 'Failed to delete purchase order'
              );
            },
          }
        );
      }
    },
    [deleteMutation, confirm]
  );

  const handleReceive = useCallback(
    (id: string) => {
      // Open receiving dialog directly (no navigation)
      receivingDialog.openDialog(id);
    },
    [receivingDialog]
  );

  const handleCreate = useCallback(() => {
    navigate({ to: '/purchase-orders/create' });
  }, [navigate]);

  // Transform data for table
  const orders: PurchaseOrderTableData[] = useMemo(
    () =>
      (ordersData?.items ?? []).map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        status: po.status,
        totalAmount: Number(po.totalAmount) || 0,
        currency: po.currency || DEFAULT_CURRENCY,
        orderDate: po.orderDate ? String(po.orderDate) : null,
        requiredDate: po.requiredDate ? String(po.requiredDate) : null,
        expectedDeliveryDate: po.expectedDeliveryDate ? String(po.expectedDeliveryDate) : null,
        createdAt: String(po.createdAt),
      })),
    [ordersData]
  );

  const pagination = useMemo(
    () => ({
      page,
      pageSize,
      totalItems: ordersData?.pagination?.totalItems ?? 0,
      totalPages: ordersData?.pagination?.totalPages ?? 1,
    }),
    [page, pageSize, ordersData]
  );

  // Selected POs for bulk operations
  const selectedPOs = useMemo(
    () => orders.filter((po) => selectedIds.has(po.id)),
    [orders, selectedIds]
  );

  // Selection handlers
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    const idx = orders.findIndex((o) => o.id === id);
    if (idx !== -1) lastSelectedIndexRef.current = idx;
  }, [orders]);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(orders.map((o) => o.id)) : new Set());
  }, [orders]);

  const handleShiftClickRange = useCallback((rowIndex: number) => {
    const lastIndex = lastSelectedIndexRef.current;
    if (lastIndex === -1) {
      const id = orders[rowIndex]?.id;
      if (id) setSelectedIds((prev) => new Set(prev).add(id));
      lastSelectedIndexRef.current = rowIndex;
      return;
    }
    const start = Math.min(lastIndex, rowIndex);
    const end = Math.max(lastIndex, rowIndex);
    const rangeIds = orders.slice(start, end + 1).map((o) => o.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      rangeIds.forEach((id) => next.add(id));
      return next;
    });
    lastSelectedIndexRef.current = rowIndex;
  }, [orders]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const handleBulkReceive = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBulkReceivingOpen(true);
  }, [selectedIds.size]);

  const pendingApprovalPOs = useMemo(
    () => selectedPOs.filter((po) => po.status === 'pending_approval'),
    [selectedPOs]
  );
  const canBulkApprove = pendingApprovalPOs.length > 0;

  const draftPOs = useMemo(
    () => selectedPOs.filter((po) => po.status === 'draft'),
    [selectedPOs]
  );
  const canBulkDelete = draftPOs.length > 0;

  const handleBulkApprove = useCallback(async () => {
    if (!canBulkApprove) return;
    const result = await confirm.confirm({
      title: 'Bulk Approve Purchase Orders',
      description: `Approve ${pendingApprovalPOs.length} purchase order${pendingApprovalPOs.length === 1 ? '' : 's'}?`,
      confirmLabel: 'Approve',
    });
    if (!result.confirmed) return;

    try {
      const { approvalIds } = await getApprovalIdsForPurchaseOrders({
        data: { purchaseOrderIds: pendingApprovalPOs.map((po) => po.id) },
      });
      if (approvalIds.length === 0) {
        toast.error('No approval requests found', {
          description: 'The selected POs may not have pending approvals assigned to you.',
        });
        return;
      }
      const bulkResult = await bulkApproveMutation.mutateAsync({
        approvalIds,
      });
      const approved = bulkResult.approved.length;
      const failed = bulkResult.failed.length;
      if (approved > 0) {
        toast.success(`Approved ${approved} purchase order${approved === 1 ? '' : 's'}`);
      }
      if (failed > 0) {
        toast.error(`${failed} approval${failed === 1 ? ' failed' : 's failed'}`);
      }
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to bulk approve purchase orders'
      );
    }
  }, [
    canBulkApprove,
    pendingApprovalPOs,
    confirm,
    bulkApproveMutation,
  ]);

  const handleBulkDelete = useCallback(async () => {
    if (!canBulkDelete) return;
    const result = await confirm.confirm({
      title: 'Bulk Delete Purchase Orders',
      description: `Delete ${draftPOs.length} draft purchase order${draftPOs.length === 1 ? '' : 's'}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!result.confirmed) return;

    try {
      const bulkResult = await bulkDeleteMutation.mutateAsync({
        purchaseOrderIds: draftPOs.map((po) => po.id),
      });
      if (bulkResult.deleted > 0) {
        toast.success(`Deleted ${bulkResult.deleted} purchase order${bulkResult.deleted === 1 ? '' : 's'}`);
      }
      if (bulkResult.failed.length > 0) {
        toast.error(`${bulkResult.failed.length} could not be deleted`);
      }
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to bulk delete purchase orders'
      );
    }
  }, [canBulkDelete, draftPOs, confirm, bulkDeleteMutation]);

  const handleBulkReceiveConfirm = useCallback(
    async (receiptData: BulkReceiptData) => {
      return bulkReceiveMutation.mutateAsync({
        purchaseOrderIds: receiptData.purchaseOrderIds,
        serialNumbers: receiptData.serialNumbers
          ? Object.fromEntries(
              Array.from(receiptData.serialNumbers.entries()).map(([poId, itemMap]) => [
                poId,
                Object.fromEntries(itemMap.entries()),
              ])
            )
          : undefined,
      });
    },
    [bulkReceiveMutation]
  );

  const handleBulkDialogChange = useCallback((open: boolean) => {
    setBulkReceivingOpen(open);
    if (!open) setSelectedIds(new Set());
  }, []);

  return (
    <PageLayout variant="full-width">
      <PageLayout.Header
        title="Purchase Orders"
        description="Track and manage your supplier orders"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  More <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="p-0">
                  <Link to="/purchase-orders" search={{ status: 'pending_approval' }} className="flex w-full items-center px-2 py-1.5">
                    <Clock className="h-4 w-4 mr-2" />
                    Pending Approval
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-0">
                  <Link to="/purchase-orders" search={{ status: 'partial_received' }} className="flex w-full items-center px-2 py-1.5">
                    <Package className="h-4 w-4 mr-2" />
                    Partially Received
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-0">
                  <Link to="/suppliers" className="flex w-full items-center px-2 py-1.5">
                    <Building2 className="h-4 w-4 mr-2" />
                    Suppliers
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </div>
        }
      />
      <PageLayout.Content>
        {selectedIds.size >= 2 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onClear={() => setSelectedIds(new Set())}
          >
            {canBulkApprove && (
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Bulk Approve ({pendingApprovalPOs.length})
              </Button>
            )}
            {canBulkDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Bulk Delete ({draftPOs.length})
              </Button>
            )}
            <Button size="sm" onClick={handleBulkReceive}>
              <Package className="h-4 w-4 mr-2" />
              Bulk Receive ({selectedIds.size})
            </Button>
          </BulkActionsBar>
        )}
        <PODirectory
          orders={orders}
          isLoading={isLoadingOrders}
          error={ordersError ?? null}
          onRetry={() => refetch()}
          filters={filters}
          statusCounts={statusCounts ?? null}
          onFiltersChange={handleFiltersChange}
          pagination={pagination}
          onPageChange={handlePageChange}
          sortField={sortBy}
          sortDirection={sortOrder}
          onSortChange={handleSortChange}
          selectedIds={selectedIds}
          onSelect={handleSelect}
          onSelectAll={handleSelectAll}
          onShiftClickRange={handleShiftClickRange}
          isSelected={isSelected}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReceive={handleReceive}
        />
      </PageLayout.Content>

      {/* Bulk Receiving Dialog */}
      <BulkReceivingDialogContainer
        open={bulkReceivingOpen}
        onOpenChange={handleBulkDialogChange}
        purchaseOrders={selectedPOs}
        onConfirm={handleBulkReceiveConfirm}
        isLoading={bulkReceiveMutation.isPending}
      />

      {/* Goods Receipt Dialog - opened directly from list or URL param */}
      {receivingDialog.isOpen && (
        <ReceivingDialogWrapper
          open={receivingDialog.isOpen}
          onOpenChange={receivingDialog.onOpenChange}
          poId={receivingDialog.selectedPOId}
          onReceiptComplete={() => {
            // Refetch will happen automatically via query invalidation
          }}
        />
      )}
    </PageLayout>
  );
}
