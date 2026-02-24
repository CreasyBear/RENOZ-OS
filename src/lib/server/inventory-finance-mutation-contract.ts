import { ValidationError } from '@/lib/server/errors';
import type {
  InventoryFinanceErrorCode,
  InventoryFinanceMutationResult,
} from '@/lib/schemas/inventory';

export type InventoryFinanceMutationEnvelope<T> = T & InventoryFinanceMutationResult;

export function inventoryFinanceMutationSuccess<T extends Record<string, unknown>>(
  payload: T,
  message: string,
  options: Omit<InventoryFinanceMutationResult, 'success' | 'message'> = {}
): InventoryFinanceMutationEnvelope<T> {
  return {
    ...payload,
    success: true,
    message,
    ...options,
  };
}

export function createInventoryFinanceError(
  message: string,
  code: InventoryFinanceErrorCode
): ValidationError {
  return new ValidationError(message, { code: [code] });
}

