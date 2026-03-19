type MutationClientErrorKind =
  | 'conflict'
  | 'validation'
  | 'retryable'
  | 'blocked'
  | 'not_found'
  | 'unknown';

type MutationErrorDomain = 'order' | 'shipment';

interface MutationClientErrorOptions {
  message: string;
  kind: MutationClientErrorKind;
  domain: MutationErrorDomain;
  code?: string;
  statusCode?: number;
  fieldErrors?: Record<string, string[]>;
  raw: unknown;
}

export interface OrderMutationClientError extends Error {
  domain: 'order';
  kind: MutationClientErrorKind;
  code?: string;
  statusCode?: number;
  fieldErrors?: Record<string, string[]>;
  raw: unknown;
}

export interface ShipmentMutationClientError extends Error {
  domain: 'shipment';
  kind: MutationClientErrorKind;
  code?: string;
  statusCode?: number;
  fieldErrors?: Record<string, string[]>;
  raw: unknown;
}

interface ErrorShape {
  message: string;
  code?: string;
  statusCode?: number;
  fieldErrors?: Record<string, string[]>;
  validationCodes: string[];
}

const BLOCKED_CODES = new Set([
  'transition_blocked',
  'shipped_status_conflict',
  'inventory_conflict',
  'duplicate_replay',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toFieldErrors(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;

  const entries = Object.entries(value).filter(([, messages]) => {
    return Array.isArray(messages) && messages.every((message) => typeof message === 'string');
  });

  if (entries.length === 0) return undefined;

  return Object.fromEntries(entries) as Record<string, string[]>;
}

function extractErrorShape(error: unknown): ErrorShape {
  if (error instanceof Error) {
    const maybeError = error as Error & {
      code?: string;
      statusCode?: number;
      errors?: Record<string, string[]>;
      details?: { validationErrors?: Record<string, string[]> };
    };

    const fieldErrors =
      toFieldErrors(maybeError.errors) ??
      toFieldErrors(maybeError.details?.validationErrors);

    return {
      message: error.message,
      code: maybeError.code,
      statusCode: maybeError.statusCode,
      fieldErrors,
      validationCodes: fieldErrors?.code ?? [],
    };
  }

  if (isRecord(error)) {
    const fieldErrors =
      toFieldErrors(error.errors) ??
      (isRecord(error.details) ? toFieldErrors(error.details.validationErrors) : undefined);
    const message =
      typeof error.message === 'string'
        ? error.message
        : typeof error.error === 'string'
          ? error.error
          : 'An unexpected error occurred.';

    return {
      message,
      code: typeof error.code === 'string' ? error.code : undefined,
      statusCode: typeof error.statusCode === 'number' ? error.statusCode : undefined,
      fieldErrors,
      validationCodes: fieldErrors?.code ?? [],
    };
  }

  return {
    message: 'An unexpected error occurred.',
    validationCodes: [],
  };
}

function detectKind(shape: ErrorShape): MutationClientErrorKind {
  const normalizedCode = shape.code?.toUpperCase();
  const normalizedMessage = shape.message.toLowerCase();

  if (shape.statusCode === 404 || normalizedCode === 'NOT_FOUND') {
    return 'not_found';
  }

  if (
    shape.statusCode === 409 ||
    normalizedCode === 'CONFLICT' ||
    normalizedCode === 'VERSION_CONFLICT'
  ) {
    return 'conflict';
  }

  if (shape.statusCode === 429 || normalizedCode === 'RATE_LIMIT') {
    return 'retryable';
  }

  if (
    shape.validationCodes.some((code) => BLOCKED_CODES.has(code)) ||
    normalizedMessage.includes('cannot transition') ||
    normalizedMessage.includes('cannot cancel') ||
    normalizedMessage.includes('already shipped') ||
    normalizedMessage.includes('not allocated')
  ) {
    return 'blocked';
  }

  if (shape.statusCode === 400 || normalizedCode === 'VALIDATION_ERROR' || shape.fieldErrors) {
    return 'validation';
  }

  return 'unknown';
}

function createMutationClientError<T extends OrderMutationClientError | ShipmentMutationClientError>(
  options: MutationClientErrorOptions
): T {
  return Object.assign(new Error(options.message), {
    name: options.domain === 'order' ? 'OrderMutationClientError' : 'ShipmentMutationClientError',
    domain: options.domain,
    kind: options.kind,
    code: options.code,
    statusCode: options.statusCode,
    fieldErrors: options.fieldErrors,
    raw: options.raw,
  }) as T;
}

function normalizeMutationError<T extends OrderMutationClientError | ShipmentMutationClientError>(
  error: unknown,
  domain: MutationErrorDomain,
  fallbackMessage: string
): T {
  const shape = extractErrorShape(error);
  return createMutationClientError<T>({
    domain,
    kind: detectKind(shape),
    message: shape.message || fallbackMessage,
    code: shape.code,
    statusCode: shape.statusCode,
    fieldErrors: shape.fieldErrors,
    raw: error,
  });
}

export function normalizeOrderMutationError(
  error: unknown,
  fallbackMessage = 'Order request failed.'
): OrderMutationClientError {
  return normalizeMutationError<OrderMutationClientError>(error, 'order', fallbackMessage);
}

export function normalizeShipmentMutationError(
  error: unknown,
  fallbackMessage = 'Shipment request failed.'
): ShipmentMutationClientError {
  return normalizeMutationError<ShipmentMutationClientError>(error, 'shipment', fallbackMessage);
}

export function expectOrderQueryData<T>(
  result: T | null | undefined,
  message = 'Order data is unavailable.'
): T {
  if (result != null) return result;
  throw createMutationClientError<OrderMutationClientError>({
    domain: 'order',
    kind: 'not_found',
    message,
    code: 'NOT_FOUND',
    statusCode: 404,
    raw: result,
  });
}

export function expectShipmentQueryData<T>(
  result: T | null | undefined,
  message = 'Shipment data is unavailable.'
): T {
  if (result != null) return result;
  throw createMutationClientError<ShipmentMutationClientError>({
    domain: 'shipment',
    kind: 'not_found',
    message,
    code: 'NOT_FOUND',
    statusCode: 404,
    raw: result,
  });
}

export function getClientErrorMessage(
  error: OrderMutationClientError | ShipmentMutationClientError,
  fallbackMessage: string
): string {
  if (error.kind === 'conflict') {
    return error.message || `${fallbackMessage} Refresh and try again.`;
  }

  if (error.kind === 'retryable') {
    return error.message || `${fallbackMessage} Please retry in a moment.`;
  }

  if (error.kind === 'not_found') {
    return error.message || `${fallbackMessage} The record could not be found.`;
  }

  return error.message || fallbackMessage;
}
