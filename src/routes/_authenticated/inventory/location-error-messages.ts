import { formatInventoryMutationError } from '@/hooks/inventory/_mutation-errors';

const LOCATION_SAVE_FAILED_MESSAGE = 'Failed to save location';
const LOCATION_IMPORT_FAILED_MESSAGE = 'Failed to import locations';

export class LocationImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationImportValidationError';
  }
}

export function getLocationMutationSubmitError(error: unknown): string | null {
  if (!error) return null;
  return formatInventoryMutationError(error, LOCATION_SAVE_FAILED_MESSAGE);
}

export function getLocationImportErrorMessage(error: unknown): string {
  if (error instanceof LocationImportValidationError) return error.message;
  return formatInventoryMutationError(error, LOCATION_IMPORT_FAILED_MESSAGE);
}
