/**
 * Receiving Dashboard Container
 *
 * Container responsibilities:
 * - Fetches purchase orders awaiting receipt (status: 'ordered')
 * - Manages selection state for bulk operations
 * - Provides receiving action handlers
 * - Passes data to presenter component
 *
 * @source orders from usePurchaseOrders hook
 * @source bulkReceiveMutation from useBulkReceiveGoods hook
 *
 * @see ./receiving-dashboard.tsx (presenter)
 * @see src/hooks/suppliers/use-purchase-orders.ts
 * @see docs/design-system/DASHBOARD-STANDARDS.md (Operational Dashboard)
 */

import { useMemo, useCallback, useState } from 'react';
import { usePurchaseOrders } from '@/hooks/suppliers';
import { useBulkReceiveGoods } from '@/hooks/suppliers/use-bulk-receive-goods';
import { useTableSelection } from '@/components/shared/data-table';
import type { PurchaseOrderTableData } from '@/lib/schemas/purchase-orders';
import { ReceivingDashboard } from './receiving-dashboard';
import { BulkReceivingDialogContainer } from './bulk-receiving-dialog-container';
import type { BulkReceiptData } from '@/lib/schemas/procurement/procurement-types';

// ============================================================================
// CONSTANTS
// ============================================================================

const POLLING_INTERVAL = 30000; // 30 seconds - operational dashboard needs real-time updates

// ============================================================================
// TYPES
// ============================================================================

export interface ReceivingDashboardContainerProps {
  /** Navigate to PO detail view */
  onViewPO?: (poId: string) => void;
  /** Open receiving dialog for single PO */
  onReceivePO?: (poId: string) => void;
  /** Additional className */
  className?: string;
}

// ============================================================================
// CONTAINER
// ============================================================================

export function ReceivingDashboardContainer({
  onViewPO,
  onReceivePO,
  className,
}: ReceivingDashboardContainerProps) {
  // ===========================================================================
  // DATA FETCHING (Container responsibility)
  // ===========================================================================

  // Fetch purchase orders awaiting receipt (status: 'ordered')
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = usePurchaseOrders({
    status: ['ordered'], // Only show POs that are ordered and awaiting receipt
    page: 1,
    pageSize: 100, // Show more items for operational dashboard
    sortBy: 'orderDate',
    sortOrder: 'asc', // Oldest first - process in order
    refetchInterval: POLLING_INTERVAL,
  });

  // Transform data for presenter (normalize createdAt: Date -> string for PurchaseOrderTableData)
  const orders = useMemo<PurchaseOrderTableData[]>(
    () =>
      (ordersData?.items ?? []).map((item) => ({
        ...item,
        createdAt:
          item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      })),
    [ordersData]
  );

  const totalOrders = ordersData?.pagination?.totalItems ?? 0;

  // ===========================================================================
  // SELECTION STATE (for bulk operations)
  // ===========================================================================

  const {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartiallySelected,
    handleSelect,
    handleSelectAll,
    handleShiftClickRange,
    clearSelection,
    isSelected,
  } = useTableSelection({ items: orders });

  // ===========================================================================
  // METRICS CALCULATION
  // ===========================================================================

  const metrics = useMemo(() => {
    const totalValue = orders.reduce((sum, po) => sum + (po.totalAmount ?? 0), 0);
    const supplierCount = new Set(orders.map((po) => po.supplierId)).size;
    const oldestOrderDate = orders.length > 0
      ? orders.reduce((oldest, po) => {
          const poDate = po.orderDate ? new Date(po.orderDate) : null;
          const oldestDate = oldest ? new Date(oldest) : null;
          if (!poDate) return oldest;
          if (!oldestDate) return po.orderDate;
          return poDate < oldestDate ? po.orderDate : oldest;
        }, orders[0].orderDate)
      : null;

    return {
      totalOrders,
      totalValue,
      supplierCount,
      oldestOrderDate,
    };
  }, [orders, totalOrders]);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkReceiveAttempted, setBulkReceiveAttempted] = useState(false);

  // Bulk receiving mutation
  const bulkReceiveMutation = useBulkReceiveGoods();

  const handleBulkReceive = useMemo(() => {
    if (selectedIds.size === 0) return undefined;
    return () => {
      bulkReceiveMutation.reset();
      setBulkReceiveAttempted(false);
      setBulkDialogOpen(true);
    };
  }, [selectedIds, bulkReceiveMutation]);

  const handleRefetch = useCallback(() => {
    refetchOrders();
  }, [refetchOrders]);

  const handleBulkConfirm = useCallback(
    async (receiptData: BulkReceiptData) => {
      setBulkReceiveAttempted(true);
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
        onProgress: () => {
          // Progress updates handled by dialog
        },
      });
    },
    [bulkReceiveMutation]
  );

  const handleBulkDialogOpenChange = useCallback(
    (open: boolean) => {
      setBulkDialogOpen(open);
      if (!open) {
        if (bulkReceiveAttempted) {
          const failedIds = bulkReceiveMutation.data?.errors
            ?.map((entry) => entry.poId)
            .filter(Boolean) ?? [];

          clearSelection();
          failedIds.forEach((failedId) => {
            handleSelect(failedId, true);
          });
          setBulkReceiveAttempted(false);
        }
        refetchOrders();
      }
    },
    [bulkReceiveAttempted, bulkReceiveMutation.data, clearSelection, handleSelect, refetchOrders]
  );

  return (
    <>
      <ReceivingDashboard
        orders={orders}
        metrics={metrics}
        isLoading={isLoadingOrders}
        error={ordersError instanceof Error ? ordersError : null}
        onRefetch={handleRefetch}
        selectedIds={selectedIds}
        isAllSelected={isAllSelected}
        isPartiallySelected={isPartiallySelected}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
        onShiftClickRange={handleShiftClickRange}
        onClearSelection={clearSelection}
        isSelected={isSelected}
        onViewPO={onViewPO}
        onReceivePO={onReceivePO}
        onBulkReceive={handleBulkReceive}
        className={className}
      />

      {/* Bulk Receiving Dialog Container */}
      <BulkReceivingDialogContainer
        open={bulkDialogOpen}
        onOpenChange={handleBulkDialogOpenChange}
        purchaseOrders={selectedItems}
        onConfirm={handleBulkConfirm}
        isLoading={bulkReceiveMutation.isPending}
      />
    </>
  );
}
