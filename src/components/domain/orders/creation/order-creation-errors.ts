import {
  getClientErrorMessage,
  normalizeOrderMutationError,
} from '@/hooks/orders/order-mutation-client-errors';

const ORDER_CREATION_FALLBACK = 'Unable to create order.';

const SAFE_LOCAL_VALIDATION_MESSAGES = new Set([
  'Customer is required',
  'At least one item is required',
  'Order total is negative - please review discounts',
  'GST amount exceeds subtotal - please verify GST rate',
  'Total discount exceeds subtotal - please review discount amounts',
]);

const SAFE_LOCAL_VALIDATION_PATTERNS = [
  /^Line item ".+": cannot specify both percentage and fixed discount$/,
  /^Line item ".+": discount cannot exceed line total$/,
];

const UNSAFE_MESSAGE_PATTERNS = [
  'api key',
  'client_secret',
  'duplicate key',
  'violates',
  'constraint',
  'postgres',
  'supabase',
  'database',
  'stack',
  'token',
  'internal server error',
  'sql',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUnsafeOrderCreationMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return UNSAFE_MESSAGE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isSafeLocalCreationMessage(message: string): boolean {
  const trimmed = message.trim();
  if (SAFE_LOCAL_VALIDATION_MESSAGES.has(trimmed)) return true;
  if (SAFE_LOCAL_VALIDATION_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  const combinedMessages = trimmed.split('. ').filter(Boolean);
  return (
    combinedMessages.length > 1 &&
    combinedMessages.every((entry) => SAFE_LOCAL_VALIDATION_MESSAGES.has(entry))
  );
}

function extractValidationErrors(error: unknown): Record<string, string[]> | undefined {
  if (!isRecord(error)) return undefined;

  const fieldErrors = isRecord(error.fieldErrors) ? error.fieldErrors : undefined;
  const detailErrors =
    isRecord(error.details) && isRecord(error.details.validationErrors)
      ? error.details.validationErrors
      : undefined;
  const validationErrors = fieldErrors ?? detailErrors;

  if (!validationErrors) return undefined;

  return Object.fromEntries(
    Object.entries(validationErrors).filter(([, messages]) => {
      return Array.isArray(messages) && messages.every((message) => typeof message === 'string');
    })
  ) as Record<string, string[]>;
}

export function getOrderCreationSubmitErrorMessage(error: unknown): string {
  if (error instanceof Error && isSafeLocalCreationMessage(error.message)) {
    return error.message.trim();
  }

  const normalized = normalizeOrderMutationError(error, ORDER_CREATION_FALLBACK);
  return getClientErrorMessage(normalized, ORDER_CREATION_FALLBACK);
}

export function getOrderCreationFieldErrors(error: unknown): Record<string, string> {
  const validationErrors = extractValidationErrors(error);
  if (!validationErrors) return {};

  return Object.fromEntries(
    Object.entries(validationErrors)
      .map(([key, messages]) => {
        const message = messages.find((entry) => {
          const trimmed = entry.trim();
          return trimmed.length > 0 && !isUnsafeOrderCreationMessage(trimmed);
        });
        return message ? [key, message.trim()] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null)
  );
}
