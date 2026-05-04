import { formatInventoryMutationError } from '@/hooks/inventory/_mutation-errors';

export const RECEIVING_LOCATIONS_UNAVAILABLE_MESSAGE =
  'Warehouse locations are temporarily unavailable. Please refresh and try again.';

export function getReceiveSubmitError(error: unknown): string | null {
  if (!error) return null;
  return formatInventoryMutationError(error, 'Failed to receive inventory');
}

export function getReceivingLocationsErrorMessage(error: unknown): string | null {
  return error ? RECEIVING_LOCATIONS_UNAVAILABLE_MESSAGE : null;
}
