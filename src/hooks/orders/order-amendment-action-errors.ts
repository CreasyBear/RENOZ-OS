import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from './order-mutation-client-errors';

export type OrderAmendmentAction =
  | 'request'
  | 'approve'
  | 'reject'
  | 'apply'
  | 'approve-and-apply'
  | 'cancel';

const ORDER_AMENDMENT_ACTION_FALLBACKS: Record<OrderAmendmentAction, string> = {
  request: 'Unable to request amendment.',
  approve: 'Unable to approve amendment.',
  reject: 'Unable to reject amendment.',
  apply: 'Unable to apply amendment.',
  'approve-and-apply': 'Amendment was approved, but could not be applied.',
  cancel: 'Unable to cancel amendment.',
};

const ORDER_AMENDMENT_STEP_LABELS: Partial<Record<OrderAmendmentAction, string>> = {
  request: 'Request failed',
  approve: 'Approval failed',
  apply: 'Apply failed',
};

export function getOrderAmendmentActionErrorMessage(
  error: unknown,
  action: OrderAmendmentAction
): string {
  const fallback = ORDER_AMENDMENT_ACTION_FALLBACKS[action];
  const normalized = normalizeOrderMutationError(error, fallback);
  return getClientErrorMessage(normalized, fallback);
}

export function getOrderAmendmentStepErrorMessage(
  error: unknown,
  action: Extract<OrderAmendmentAction, 'request' | 'approve' | 'apply'>
): string {
  return `${ORDER_AMENDMENT_STEP_LABELS[action]}: ${getOrderAmendmentActionErrorMessage(
    error,
    action
  )}`;
}
