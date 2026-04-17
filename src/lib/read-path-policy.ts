import { normalizeError, normalizeQueryError, type QueryClientError } from '@/lib/error-handling';

export type ReadContractType = 'always-shaped' | 'detail-not-found' | 'nullable-by-design';

export type ReadFailureKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'rate-limited'
  | 'system'
  | 'unknown';

export type ConsumerCriticality = 'headline' | 'secondary' | 'optional';

export interface ReadQueryError extends QueryClientError {
  failureKind: ReadFailureKind;
  contractType?: ReadContractType;
}

export const READ_PATH_COPY = {
  unavailable: 'Temporarily unavailable. Please refresh and try again.',
  notFound: 'The requested item could not be found.',
  absent: 'This information is not available for this record.',
} as const;

function extractRawErrorSignal(error: unknown): {
  code?: string;
  statusCode?: number;
} {
  if (error && typeof error === 'object') {
    const candidate = error as {
      code?: unknown;
      status?: unknown;
      statusCode?: unknown;
      response?: { status?: unknown } | null;
    };

    const code = typeof candidate.code === 'string' ? candidate.code : undefined;
    const statusCode =
      typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : typeof candidate.status === 'number'
          ? candidate.status
          : typeof candidate.response?.status === 'number'
            ? candidate.response.status
            : undefined;

    return { code, statusCode };
  }

  return {};
}

export function classifyReadFailureKind(error: unknown): ReadFailureKind {
  const rawSignal = extractRawErrorSignal(error);
  const normalized = normalizeError(error);
  const code = rawSignal.code ?? normalized.code ?? '';
  const statusCode = rawSignal.statusCode ?? normalized.statusCode;

  if (statusCode === 401 || code === 'AUTH_ERROR' || code === 'UNAUTHORIZED') {
    return 'unauthorized';
  }

  if (
    statusCode === 403 ||
    code === 'FORBIDDEN' ||
    code === 'PERMISSION_DENIED'
  ) {
    return 'forbidden';
  }

  if (statusCode === 404 || code === 'NOT_FOUND') {
    return 'not-found';
  }

  if (
    statusCode === 400 ||
    code === 'VALIDATION_ERROR' ||
    code === 'ISSUE_ANCHOR_CONFLICT'
  ) {
    return 'validation';
  }

  if (statusCode === 429 || code === 'RATE_LIMIT' || code === 'RATE_LIMITED') {
    return 'rate-limited';
  }

  if (
    code === 'NETWORK_ERROR' ||
    code === 'SERVER_ERROR' ||
    code === 'INTERNAL_ERROR' ||
    (typeof statusCode === 'number' && statusCode >= 500)
  ) {
    return 'system';
  }

  return 'unknown';
}

export function normalizeReadQueryError(
  error: unknown,
  options: {
    fallbackMessage: string;
    contractType: ReadContractType;
    notFoundMessage?: string;
  }
): ReadQueryError {
  const rawSignal = extractRawErrorSignal(error);
  const normalized = normalizeQueryError(error, options.fallbackMessage);
  const failureKind = classifyReadFailureKind(error);
  let message = normalized.message;

  if (rawSignal.code && normalized.code === 'UNKNOWN_ERROR') {
    normalized.code = rawSignal.code;
  }

  if (rawSignal.statusCode !== undefined && normalized.statusCode === undefined) {
    normalized.statusCode = rawSignal.statusCode;
  }

  if (failureKind === 'not-found' && options.notFoundMessage) {
    message = options.notFoundMessage;
  } else if (
    failureKind === 'system' ||
    failureKind === 'unknown' ||
    failureKind === 'validation'
  ) {
    message = options.fallbackMessage;
  }

  normalized.name = 'ReadQueryError';
  normalized.message = message;

  return Object.assign(normalized, {
    failureKind,
    contractType: options.contractType,
  });
}

export function isReadQueryError(error: unknown): error is ReadQueryError {
  return (
    error instanceof Error &&
    'failureKind' in error &&
    typeof (error as ReadQueryError).failureKind === 'string'
  );
}
