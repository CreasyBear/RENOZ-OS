/**
 * Receiving Dialog Wrapper Component
 *
 * Handles loading states, error states, and empty states for the receiving dialog.
 * Encapsulates complex conditional rendering logic.
 *
 * @see STANDARDS.md - Component composition patterns
 */

import { useMemo } from 'react';
import { GoodsReceiptDialog } from './goods-receipt-dialog';
import {
  transformPOItemsToReceiptItems,
  filterItemsWithPendingQuantity,
} from '../utils/po-item-transform';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePurchaseOrder } from '@/hooks/suppliers';
import { useProductSerialization } from '@/hooks/purchase-orders/use-product-serialization';

// ============================================================================
// TYPES
// ============================================================================

export interface ReceivingDialogWrapperProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Dialog open change handler */
  onOpenChange: (open: boolean) => void;
  /** Selected PO ID */
  poId: string | null;
  /** Callback when receipt is completed */
  onReceiptComplete?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Wrapper component for GoodsReceiptDialog that handles:
 * - Loading state while PO details are fetched
 * - Error state if PO details fail to load
 * - Empty state if no items to receive
 * - Data transformation and filtering
 */
export function ReceivingDialogWrapper({
  open,
  onOpenChange,
  poId,
  onReceiptComplete,
}: ReceivingDialogWrapperProps) {
  // Fetch PO details when dialog opens (lazy loading)
  const {
    data: poDetails,
    isLoading: isPODetailsLoading,
    error: poDetailsError,
    refetch,
  } = usePurchaseOrder(poId ?? '', {
    enabled: open && !!poId,
  });

  // Fetch product serialization data using dedicated hook
  const productIds = useMemo(() => {
    if (!poDetails?.items) return [];
    return poDetails.items
      .map((item) => item.productId)
      .filter((id): id is string => id !== null);
  }, [poDetails]);

  const { serializationMap, isLoading: isProductSerializationLoading } =
    useProductSerialization(productIds, open && !!poId);

  // Transform PO items for GoodsReceiptDialog (using shared utility)
  // Filter to only items with pending quantities
  // Enrich with serialization requirements from product data
  const receiptItems = useMemo(() => {
    if (!poDetails?.items) return [];
    const transformed = transformPOItemsToReceiptItems(poDetails.items);
    const filtered = filterItemsWithPendingQuantity(transformed);
    
    // Enrich with serialization requirements from product data
    return filtered.map((item) => ({
      ...item,
      requiresSerialNumbers: item.productId
        ? serializationMap.get(item.productId) ?? false
        : false,
    }));
  }, [poDetails, serializationMap]);

  // Handle receipt completion
  const handleReceiptComplete = () => {
    onReceiptComplete?.();
    onOpenChange(false);
  };

  // Don't render anything if dialog is closed or no PO ID
  if (!open || !poId) return null;

  // Loading state
  if (isPODetailsLoading || isProductSerializationLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-lg">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (poDetailsError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
        <div className="rounded-lg border bg-card p-6 shadow-lg max-w-md">
          <ErrorState
            title="Failed to load purchase order"
            message={
              poDetailsError instanceof Error
                ? poDetailsError.message
                : 'Unable to load purchase order details. Please try again.'
            }
            onRetry={() => {
              refetch();
            }}
            retryLabel="Retry"
          />
        </div>
      </div>
    );
  }

  // Empty state (no items to receive)
  if (!poDetails || receiptItems.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
        <div className="rounded-lg border bg-card p-6 shadow-lg max-w-md">
          <ErrorState
            title="No items to receive"
            message="This purchase order has no pending items to receive. All items have already been received."
            onRetry={() => onOpenChange(false)}
            retryLabel="Close"
          />
        </div>
      </div>
    );
  }

  // Render dialog with data
  return (
    <GoodsReceiptDialog
      open={open}
      onOpenChange={onOpenChange}
      poId={poId}
      poNumber={poDetails.poNumber}
      items={receiptItems}
      onReceiptComplete={handleReceiptComplete}
    />
  );
}
