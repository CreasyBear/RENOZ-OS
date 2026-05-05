import { isReadQueryError } from '@/lib/read-path-policy';

export const PURCHASE_ORDER_DETAIL_FALLBACK_MESSAGE =
  'Purchase order details are temporarily unavailable. Please refresh and try again.';

export const PURCHASE_ORDER_DETAIL_NOT_FOUND_MESSAGE =
  "The purchase order you're looking for doesn't exist or has been deleted.";

export function getPurchaseOrderDetailErrorMessage(error: unknown): string {
  if (!error) {
    return PURCHASE_ORDER_DETAIL_NOT_FOUND_MESSAGE;
  }

  return isReadQueryError(error) ? error.message : PURCHASE_ORDER_DETAIL_FALLBACK_MESSAGE;
}
