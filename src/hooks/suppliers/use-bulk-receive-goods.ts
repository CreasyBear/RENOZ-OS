/**
 * Bulk Receive Goods Hook
 *
 * TanStack Query mutation hook for bulk receiving goods against multiple purchase orders.
 * Delegates to server function for proper separation of concerns.
 *
 * @see src/server/functions/suppliers/bulk-receive-goods.ts (server-side implementation)
 * @see STANDARDS.md - Hook patterns
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { queryKeys } from '@/lib/query-keys';
import { formatPurchaseOrderBulkReceiveMutationError } from '@/hooks/purchase-orders/_mutation-errors';
import { bulkReceiveGoods } from '@/server/functions/suppliers/bulk-receive-goods';
import { toastSuccess, toastError } from '@/hooks';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkReceiveGoodsInput {
  purchaseOrderIds: string[];
  serialNumbers?: Record<string, Record<string, string[]>>; // poId -> poItemId -> serialNumbers[]
  onProgress?: (processed: number, skipped: number, failed: number, currentPO?: string) => void;
}

export interface BulkReceiveGoodsResult {
  success: true;
  message: string;
  processed: number;
  skipped: number;
  failed: number;
  skippedDetails: Array<{ poId: string; reason: string }>;
  errors: Array<{ poId: string; error: string; code?: string }>;
  errorsById?: Record<string, string>;
  partialFailure?: { code: string; message: string };
  affectedIds?: string[];
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for bulk receiving goods against multiple purchase orders.
 *
 * Delegates to server function for proper separation of concerns.
 * Server function handles:
 * - PO validation
 * - Product serialization checks
 * - Receipt creation
 * - Error handling
 *
 * @see src/server/functions/suppliers/bulk-receive-goods.ts
 */
export function useBulkReceiveGoods() {
  const queryClient = useQueryClient();
  const bulkReceiveFn = useServerFn(bulkReceiveGoods);

  return useMutation({
    mutationFn: async ({ purchaseOrderIds, serialNumbers, onProgress }: BulkReceiveGoodsInput): Promise<BulkReceiveGoodsResult> => {
      // Call server function - all business logic handled server-side
      const result = await bulkReceiveFn({
        data: {
          purchaseOrderIds,
          serialNumbers,
        },
      });

      // Report progress (server function processes sequentially)
      // Note: For true real-time progress tracking, we'd need server-side streaming or polling
      // For now, we report completion after server function returns
      if (onProgress) {
        onProgress(result.processed, result.skipped, result.failed);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      const affectedPurchaseOrderIds = Array.from(
        new Set([...variables.purchaseOrderIds, ...(data.affectedIds ?? [])])
      );

      // Invalidate relevant purchase-order queries.
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderStatusCounts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersReceivingSummary() });
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrdersPendingApprovals() });

      affectedPurchaseOrderIds.forEach((purchaseOrderId) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderDetail(purchaseOrderId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderItems(purchaseOrderId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.purchaseOrderReceipts(purchaseOrderId) });
      });

      // Invalidate stock side-effect surfaces touched by receipt creation.
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

      toastSuccess(data.message);
      if (data.partialFailure?.message) {
        toastError(data.partialFailure.message);
      }
    },
    onError: (error) => {
      toastError(formatPurchaseOrderBulkReceiveMutationError(error));
    },
  });
}
