import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from './order-mutation-client-errors';

const ORDER_EDIT_SUBMIT_FALLBACK = 'Unable to update order.';

export function getOrderEditSubmitErrorMessage(error: unknown): string | null {
  if (!error) return null;

  const normalized = normalizeOrderMutationError(error, ORDER_EDIT_SUBMIT_FALLBACK);
  return getClientErrorMessage(normalized, ORDER_EDIT_SUBMIT_FALLBACK);
}
