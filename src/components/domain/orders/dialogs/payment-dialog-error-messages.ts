import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from '@/hooks/orders/order-mutation-client-errors';

export type OrderPaymentDialogAction = 'record-payment' | 'record-refund';

const ORDER_PAYMENT_DIALOG_FALLBACKS: Record<OrderPaymentDialogAction, string> = {
  'record-payment': 'Unable to record payment.',
  'record-refund': 'Unable to record refund.',
};

export function getOrderPaymentDialogErrorMessage(
  error: unknown,
  action: OrderPaymentDialogAction
): string {
  const fallback = ORDER_PAYMENT_DIALOG_FALLBACKS[action];
  const normalized = normalizeOrderMutationError(error, fallback);
  return getClientErrorMessage(normalized, fallback);
}
