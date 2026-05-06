import { ValidationError } from '@/lib/server/errors';

const BULK_IMPORT_ROW_FALLBACK =
  'Unable to import this warranty row. Review the row and retry.';

function isUnsafeWarrantyBulkImportResultMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('sql') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error') ||
    normalized.includes('typeerror') ||
    normalized.includes('referenceerror') ||
    normalized.includes('not a function') ||
    /cannot (read|set) properties of (undefined|null)/.test(normalized) ||
    /\bat\s+[\w.$<>]+\s*\(/.test(message)
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

function isSafeWarrantyBulkImportResultMessage(message: string): boolean {
  return (
    /^Serial "[A-Z0-9._/-]+" could not be resolved to a serialized item before importing this warranty\.$/.test(
      message
    ) ||
    message === 'Serialized item could not be resolved before importing this warranty.'
  );
}

export function formatWarrantyBulkImportRowFailure(error: unknown): string {
  const message =
    error instanceof ValidationError
      ? extractValidationMessage(error)
      : error instanceof Error && error.message.trim().length > 0
        ? error.message
        : null;

  if (!message || isUnsafeWarrantyBulkImportResultMessage(message)) {
    return BULK_IMPORT_ROW_FALLBACK;
  }

  return isSafeWarrantyBulkImportResultMessage(message)
    ? message
    : BULK_IMPORT_ROW_FALLBACK;
}
