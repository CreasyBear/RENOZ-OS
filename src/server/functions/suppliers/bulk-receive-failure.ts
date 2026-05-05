import {
  serializedMutationErrorCodeSchema,
  type SerializedMutationErrorCode,
} from '@/lib/schemas/inventory';
import { ValidationError } from '@/lib/server/errors';

export interface BulkReceiveFailure {
  poId: string;
  error: string;
  code?: SerializedMutationErrorCode;
}

export function toBulkReceiveFailure(poId: string, error: unknown): BulkReceiveFailure {
  const failure: BulkReceiveFailure = {
    poId,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
  const code = getSerializedMutationErrorCode(error);

  if (code) {
    failure.code = code;
  }

  return failure;
}

function getSerializedMutationErrorCode(error: unknown): SerializedMutationErrorCode | undefined {
  if (!(error instanceof ValidationError)) {
    return undefined;
  }

  const rawCode = error.errors.code?.[0];
  const parsed = serializedMutationErrorCodeSchema.safeParse(rawCode);
  return parsed.success ? parsed.data : undefined;
}
