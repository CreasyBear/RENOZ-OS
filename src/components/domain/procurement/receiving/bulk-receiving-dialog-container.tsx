/**
 * Bulk Receiving Dialog Container
 *
 * Container component that handles data fetching for bulk receiving dialog.
 * Fetches PO details and product serialization data.
 *
 * @see STANDARDS.md - Container/Presenter pattern
 * @see ./bulk-receiving-dialog.tsx (presenter)
 */

import { useMemo } from 'react';
import { useBulkPurchaseOrders } from '@/hooks/suppliers/use-bulk-purchase-orders';
import { useProductSerialization } from '@/hooks/purchase-orders/use-product-serialization';
import { BulkReceivingDialog } from './bulk-receiving-dialog';
import { transformPOItemsToReceiptItems, filterItemsWithPendingQuantity } from '@/components/domain/purchase-orders/utils/po-item-transform';
import { ErrorState } from '@/components/shared/error-state';
import type { PurchaseOrderTableData } from '@/lib/schemas/purchase-orders';
import type { BulkReceiptData, PODetailsWithSerials } from '@/lib/schemas/procurement/procurement-types';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkReceivingDialogContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrders: PurchaseOrderTableData[];
  onConfirm: (receiptData: BulkReceiptData) => Promise<{
    processed: number;
    failed: number;
    errors: Array<{ poId: string; error: string }>;
  }>;
  isLoading?: boolean;
}

// Re-export types from schemas for convenience
export type { BulkReceiptData, PODetailsWithSerials } from '@/lib/schemas/procurement/procurement-types';

// ============================================================================
// CONTAINER
// ============================================================================

/**
 * Container for bulk receiving dialog.
 * Fetches PO details and product serialization data.
 *
 * @source poQueries from useBulkPurchaseOrders hook
 * @source serializationMap from useProductSerialization hook
 */
export function BulkReceivingDialogContainer({
  open,
  onOpenChange,
  purchaseOrders,
  onConfirm,
  isLoading = false,
}: BulkReceivingDialogContainerProps) {
  // Fetch PO details for all selected POs using hook
  const poIds = useMemo(() => purchaseOrders.map((po) => po.id), [purchaseOrders]);
  const {
    queries: poQueries,
    isLoading: isLoadingPOs,
    hasErrors: hasPOErrors,
    errors: poErrors,
  } = useBulkPurchaseOrders({
    purchaseOrderIds: poIds,
    enabled: open,
  });

  // Extract product IDs from all PO items
  const productIds = useMemo(() => {
    const ids = new Set<string>();
    poQueries.forEach((query) => {
      if (query.data?.items) {
        query.data.items.forEach((item) => {
          if (item.productId) {
            ids.add(item.productId);
          }
        });
      }
    });
    return Array.from(ids);
  }, [poQueries]);

  // Fetch product serialization data
  const {
    serializationMap,
    isLoading: isProductLoading,
    hasErrors: hasProductErrors,
  } = useProductSerialization(productIds, open);

  // Build PO details with serialization info
  const poDetailsWithSerials = useMemo<PODetailsWithSerials[]>(() => {
    return purchaseOrders.map((po, index) => {
      const poQuery = poQueries[index];
      const poData = poQuery?.data;

      if (!poData || !poData.items) {
        return {
          poId: po.id,
          poNumber: po.poNumber,
          items: [],
          hasSerializedItems: false,
          totalSerializedQuantity: 0,
        };
      }

      const transformedItems = transformPOItemsToReceiptItems(poData.items);
      const pendingItems = filterItemsWithPendingQuantity(transformedItems);

      const itemsWithSerials = pendingItems.map((item) => {
        const requiresSerialNumbers = item.productId
          ? serializationMap.get(item.productId) ?? false
          : false;

        return {
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantityPending: item.quantityPending,
          requiresSerialNumbers,
        };
      });

      const serializedItems = itemsWithSerials.filter((item) => item.requiresSerialNumbers);
      const totalSerializedQuantity = serializedItems.reduce(
        (sum, item) => sum + item.quantityPending,
        0
      );

      return {
        poId: po.id,
        poNumber: po.poNumber,
        items: itemsWithSerials,
        hasSerializedItems: serializedItems.length > 0,
        totalSerializedQuantity,
      };
    });
  }, [purchaseOrders, poQueries, serializationMap]);

  // Error handling
  const hasErrors = hasPOErrors || hasProductErrors;

  // Loading state
  const isDataLoading = isLoadingPOs || isProductLoading;

  // Show error state if any PO failed to load
  if (hasErrors && open) {
    const errorMessages = poErrors
      .map((errorItem) => {
        const po = purchaseOrders.find((p) => p.id === errorItem.poId);
        const error = errorItem.error instanceof Error ? errorItem.error.message : 'Unknown error';
        return po ? `${po.poNumber}: ${error}` : error;
      })
      .filter(Boolean);

    const firstError = poErrors[0]?.error instanceof Error 
      ? poErrors[0].error.message 
      : 'Unknown error';

    return (
      <BulkReceivingDialog
        open={open}
        onOpenChange={onOpenChange}
        purchaseOrders={purchaseOrders}
        poDetailsWithSerials={[]}
        isLoading={false}
        onConfirm={onConfirm}
        error={
          <ErrorState
            title="Failed to load purchase order details"
            message={errorMessages.length > 0 ? errorMessages.join('; ') : firstError}
            onRetry={() => {
              poQueries.forEach((query) => {
                if (query.isError) {
                  query.refetch();
                }
              });
            }}
          />
        }
      />
    );
  }

  return (
    <BulkReceivingDialog
      open={open}
      onOpenChange={onOpenChange}
      purchaseOrders={purchaseOrders}
      poDetailsWithSerials={poDetailsWithSerials}
      isLoading={isDataLoading || isLoading}
      onConfirm={onConfirm}
    />
  );
}
