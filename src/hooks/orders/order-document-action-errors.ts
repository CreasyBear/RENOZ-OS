import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from './order-mutation-client-errors';
import { getShipmentActionErrorMessage } from './shipment-action-errors';

export type OrderGeneratedDocumentAction = 'quote' | 'invoice' | 'pro-forma';
export type ShipmentOperationalDocumentAction = 'packing-slip' | 'dispatch-note' | 'delivery-note';

const ORDER_DOCUMENT_ACTION_FALLBACKS: Record<OrderGeneratedDocumentAction, string> = {
  quote: 'Unable to generate quote.',
  invoice: 'Unable to generate invoice.',
  'pro-forma': 'Unable to generate pro-forma.',
};

const SHIPMENT_DOCUMENT_ACTION_FALLBACKS: Record<ShipmentOperationalDocumentAction, string> = {
  'packing-slip': 'Unable to generate packing slip.',
  'dispatch-note': 'Unable to generate dispatch note.',
  'delivery-note': 'Unable to generate delivery note.',
};

export function getOrderDocumentActionErrorMessage(
  error: unknown,
  action: OrderGeneratedDocumentAction
): string {
  const fallback = ORDER_DOCUMENT_ACTION_FALLBACKS[action];
  const normalized = normalizeOrderMutationError(error, fallback);
  return getClientErrorMessage(normalized, fallback);
}

export function getShipmentOperationalDocumentErrorMessage(
  error: unknown,
  action: ShipmentOperationalDocumentAction
): string {
  return getShipmentActionErrorMessage(error, SHIPMENT_DOCUMENT_ACTION_FALLBACKS[action]);
}
