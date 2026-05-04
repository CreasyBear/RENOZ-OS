import {
  getClientErrorMessage,
  normalizeShipmentMutationError,
} from './order-mutation-client-errors';

export function getShipmentActionErrorMessage(error: unknown, fallbackMessage: string): string {
  return getClientErrorMessage(
    normalizeShipmentMutationError(error, fallbackMessage),
    fallbackMessage
  );
}
