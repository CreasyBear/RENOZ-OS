import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from './order-mutation-client-errors';
import { getShipmentActionErrorMessage } from './shipment-action-errors';

export type OrderWorkflowActionFeedback = 'update';

const ORDER_WORKFLOW_ACTION_FALLBACKS: Record<OrderWorkflowActionFeedback, string> = {
  update: 'Unable to update the order workflow.',
};

const REOPEN_SHIPMENT_FALLBACK = 'Unable to reopen the shipment.';

export function getOrderWorkflowActionErrorMessage(
  error: unknown,
  action: OrderWorkflowActionFeedback
): string {
  const fallback = ORDER_WORKFLOW_ACTION_FALLBACKS[action];
  const normalized = normalizeOrderMutationError(error, fallback);
  return getClientErrorMessage(normalized, fallback);
}

export function getReopenShipmentActionErrorMessage(error: unknown): string {
  return getShipmentActionErrorMessage(error, REOPEN_SHIPMENT_FALLBACK);
}
