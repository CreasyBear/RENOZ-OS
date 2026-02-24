import { ValidationError } from '@/lib/server/errors';
import type { SerializedMutationErrorCode, SerializedMutationResult } from '@/lib/schemas/inventory';

export type SerializedMutationEnvelope<T> = T & SerializedMutationResult;

export function serializedMutationSuccess<T extends object>(
  payload: T,
  message: string,
  options: Omit<SerializedMutationResult, 'success' | 'message'> = {}
): SerializedMutationEnvelope<T> {
  return {
    ...payload,
    success: true,
    message,
    ...options,
  };
}

export function createSerializedMutationError(
  message: string,
  code: SerializedMutationErrorCode
): ValidationError {
  return new ValidationError(message, { code: [code] });
}
