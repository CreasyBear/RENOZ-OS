import { NotFoundError, ValidationError } from '@/lib/server/errors';

const RMA_RESULT_FALLBACKS = {
  receive: 'Unable to receive this RMA. Refresh and retry.',
  remedy: 'RMA remedy execution is blocked. Review the RMA and try again.',
} as const;

function isUnsafeRmaResultMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error') ||
    normalized.includes('sql')
  );
}

function extractValidationMessage(error: ValidationError): string | null {
  for (const [field, messages] of Object.entries(error.errors)) {
    if (field === 'code') continue;
    const message = messages.find((entry) => entry.trim().length > 0);
    if (message) return message;
  }

  return error.message.trim().length > 0 ? error.message : null;
}

function isSafeBulkReceiveMessage(message: string): boolean {
  return (
    message === 'RMA not found' ||
    /^Cannot receive RMA in [a-z_]+ status\. Must be in 'approved' status\.$/.test(message) ||
    message ===
      'Selected receiving location was not found. Choose a valid warehouse location before receiving returns.' ||
    message === 'Receiving location is required when more than one active warehouse location exists.' ||
    message === 'Receiving location is required before restoring inventory.' ||
    message ===
      'RMA line item is not linked to a product. Repair the source order line before receiving this RMA.' ||
    message === 'RMA line item must be linked to a product'
  );
}

function isSerializedReceiveMessage(message: string): boolean {
  return (
    message.includes('Serialized item record not found') ||
    message.includes('Serial number required for serialized product') ||
    message.includes('not found in inventory for this product') ||
    message.includes('would exceed single-unit bounds on return')
  );
}

function isSafeRemedyBlockedMessage(message: string): boolean {
  return (
    message === 'Source payment not found for this order.' ||
    message === 'Refund amount cannot exceed remaining refundable balance.' ||
    message === 'Customer could not be resolved for credit note creation.' ||
    message === 'Replacement order could not be created because no return lines were found.' ||
    /^Cannot execute remedy for an RMA in [a-z_]+ status\. Must be in 'received' status\.$/.test(
      message
    ) ||
    /^This RMA was already completed as [a-z_]+\.$/.test(message)
  );
}

export function formatBulkRmaReceiveFailure(error: unknown): string {
  if (error instanceof NotFoundError) {
    return 'RMA not found';
  }

  const message =
    error instanceof ValidationError
      ? extractValidationMessage(error)
      : error instanceof Error && error.message.trim().length > 0
        ? error.message
        : null;

  if (!message || isUnsafeRmaResultMessage(message)) {
    return RMA_RESULT_FALLBACKS.receive;
  }

  if (isSerializedReceiveMessage(message)) {
    return 'Serialized inventory could not be restored for this RMA. Review serial assignment and retry.';
  }

  return isSafeBulkReceiveMessage(message) ? message : RMA_RESULT_FALLBACKS.receive;
}

export function formatRmaRemedyBlockedReason(error: unknown): string {
  const message =
    error instanceof ValidationError
      ? extractValidationMessage(error)
      : error instanceof Error && error.message.trim().length > 0
        ? error.message
        : null;

  if (!message || isUnsafeRmaResultMessage(message)) {
    return RMA_RESULT_FALLBACKS.remedy;
  }

  return isSafeRemedyBlockedMessage(message) ? message : RMA_RESULT_FALLBACKS.remedy;
}
