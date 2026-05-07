import { isReadQueryError } from '@/lib/read-path-policy';
import { isUnsafeMutationErrorMessage } from '@/lib/mutation-error-feedback';

export const PURCHASE_ORDER_COSTS_FALLBACK_MESSAGE =
  'Purchase order costs are temporarily unavailable. Please refresh and try again.';

export const PURCHASE_ORDER_ALLOCATION_FALLBACK_MESSAGE =
  'Landed cost allocation is temporarily unavailable. Please refresh and try again.';

export const PURCHASE_ORDER_RECEIPTS_FALLBACK_MESSAGE =
  'Purchase order receipts are temporarily unavailable. Please refresh and try again.';

export type PurchaseOrderReadSurface = 'costs' | 'allocation' | 'receipts';

const PURCHASE_ORDER_READ_FALLBACKS: Record<PurchaseOrderReadSurface, string> = {
  allocation: PURCHASE_ORDER_ALLOCATION_FALLBACK_MESSAGE,
  costs: PURCHASE_ORDER_COSTS_FALLBACK_MESSAGE,
  receipts: PURCHASE_ORDER_RECEIPTS_FALLBACK_MESSAGE,
};

export function getPurchaseOrderReadErrorMessage(
  error: unknown,
  surface: PurchaseOrderReadSurface
): string {
  const fallback = PURCHASE_ORDER_READ_FALLBACKS[surface];
  if (!isReadQueryError(error)) {
    if (
      surface === 'allocation' &&
      error instanceof Error &&
      error.message.trim().length > 0 &&
      !isUnsafeMutationErrorMessage(error.message)
    ) {
      return error.message;
    }

    return fallback;
  }

  const message = error.message.trim();
  return message || fallback;
}
