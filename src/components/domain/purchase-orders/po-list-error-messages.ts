import { isReadQueryError } from '@/lib/read-path-policy';

export const PURCHASE_ORDER_LIST_FALLBACK_MESSAGE =
  'Purchase orders are temporarily unavailable. Please refresh and try again.';

export function getPurchaseOrderListErrorMessage(error: unknown): string {
  return isReadQueryError(error) ? error.message : PURCHASE_ORDER_LIST_FALLBACK_MESSAGE;
}
