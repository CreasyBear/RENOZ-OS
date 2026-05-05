type UnknownRecord = Record<string, unknown>;

const DEFAULT_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The requested report could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage this report.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing reports.',
  RATE_LIMIT: 'Too many report actions were attempted. Wait a moment and retry.',
};

const GENERATED_REPORT_CODE_MESSAGES: Record<string, string> = {
  PERMISSION_DENIED: 'You do not have permission to generate reports.',
  AUTH_ERROR: 'Your session has expired. Sign in again before generating reports.',
  RATE_LIMIT: 'Too many reports were generated. Wait a moment and retry.',
};

const SCHEDULED_REPORT_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The scheduled report could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage scheduled reports.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing scheduled reports.',
  RATE_LIMIT: 'Too many scheduled report actions were attempted. Wait a moment and retry.',
};

const CUSTOM_REPORT_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The custom report could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage custom reports.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing custom reports.',
  RATE_LIMIT: 'Too many custom report actions were attempted. Wait a moment and retry.',
};

interface FormatReportsMutationErrorOptions {
  codeMessages?: Record<string, string>;
}

type GeneratedReportFormat = 'csv' | 'excel' | 'pdf' | 'xlsx';

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function getValueAtPath(source: unknown, path: string[]): unknown {
  let cursor: unknown = source;
  for (const segment of path) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[segment];
  }
  return cursor;
}

function extractFirstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim().length > 0) return entry;
    }
  }
  return null;
}

function extractStatusCode(error: unknown): number | null {
  const paths = [
    ['statusCode'],
    ['status'],
    ['data', 'statusCode'],
    ['cause', 'statusCode'],
    ['cause', 'data', 'statusCode'],
    ['response', 'status'],
    ['response', 'data', 'statusCode'],
  ];

  for (const path of paths) {
    const value = getValueAtPath(error, path);
    if (typeof value === 'number') return value;
  }

  return null;
}

function extractCode(error: unknown): string | null {
  const paths = [
    ['errors', 'code'],
    ['data', 'errors', 'code'],
    ['cause', 'errors', 'code'],
    ['cause', 'data', 'errors', 'code'],
    ['details', 'validationErrors', 'code'],
    ['data', 'details', 'validationErrors', 'code'],
    ['cause', 'details', 'validationErrors', 'code'],
    ['cause', 'data', 'details', 'validationErrors', 'code'],
    ['response', 'data', 'details', 'validationErrors', 'code'],
    ['code'],
    ['data', 'code'],
    ['cause', 'code'],
    ['cause', 'data', 'code'],
    ['response', 'data', 'code'],
  ];

  for (const path of paths) {
    const code = extractFirstString(getValueAtPath(error, path));
    if (code) return code;
  }

  return null;
}

function extractFieldErrorMessage(error: unknown): string | null {
  const paths = [
    ['errors'],
    ['data', 'errors'],
    ['cause', 'errors'],
    ['cause', 'data', 'errors'],
    ['response', 'data', 'errors'],
    ['details', 'validationErrors'],
    ['data', 'details', 'validationErrors'],
    ['cause', 'details', 'validationErrors'],
    ['cause', 'data', 'details', 'validationErrors'],
    ['response', 'data', 'details', 'validationErrors'],
  ];

  for (const path of paths) {
    const fieldErrors = getValueAtPath(error, path);
    if (!isRecord(fieldErrors)) continue;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (field === 'code') continue;
      const first = extractFirstString(messages);
      if (first) return first;
    }
  }

  return null;
}

function extractMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  const paths = [
    ['message'],
    ['error'],
    ['data', 'message'],
    ['data', 'error'],
    ['cause', 'message'],
    ['cause', 'data', 'message'],
    ['response', 'data', 'message'],
    ['response', 'data', 'error'],
  ];

  for (const path of paths) {
    const message = extractFirstString(getValueAtPath(error, path));
    if (message) return message;
  }

  return null;
}

function isUnsafeMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error')
  );
}

function lookupCodeMessage(
  code: string,
  options: FormatReportsMutationErrorOptions
): string | undefined {
  return (
    options.codeMessages?.[code] ??
    DEFAULT_CODE_MESSAGES[code] ??
    DEFAULT_CODE_MESSAGES[code.toUpperCase()]
  );
}

export function formatReportsMutationError(
  error: unknown,
  fallback: string,
  options: FormatReportsMutationErrorOptions = {}
): string {
  const code = extractCode(error);
  const fieldMessage = extractFieldErrorMessage(error);
  const statusCode = extractStatusCode(error);
  const codeMessage = code ? lookupCodeMessage(code, options) : undefined;

  if (fieldMessage && !isUnsafeMessage(fieldMessage)) {
    return fieldMessage;
  }

  if (codeMessage) {
    return codeMessage;
  }

  const message = extractMessage(error);
  if (
    message &&
    !isUnsafeMessage(message) &&
    (statusCode === 400 || statusCode === 401 || statusCode === 403 || statusCode === 404)
  ) {
    return message;
  }

  return fallback;
}

function formatGeneratedReportFormat(format: GeneratedReportFormat): string {
  if (format === 'xlsx' || format === 'excel') return 'Excel';
  return format.toUpperCase();
}

export function formatGeneratedReportError(
  error: unknown,
  reportName: string,
  format?: GeneratedReportFormat
): string {
  const trimmedReportName = reportName.trim();
  const reportLabel = trimmedReportName.length > 0 ? trimmedReportName : 'Report';
  const target = format
    ? `${formatGeneratedReportFormat(format)} ${reportLabel}`
    : reportLabel;

  return formatReportsMutationError(
    error,
    `${target} generation is temporarily unavailable. Please refresh and try again.`,
    {
      codeMessages: GENERATED_REPORT_CODE_MESSAGES,
    }
  );
}

export function formatScheduledReportMutationError(
  error: unknown,
  fallback: string
): string {
  return formatReportsMutationError(error, fallback, {
    codeMessages: SCHEDULED_REPORT_CODE_MESSAGES,
  });
}

export function formatReportScheduleError(error: unknown, reportName: string): string {
  const trimmedReportName = reportName.trim();
  const reportLabel = trimmedReportName.length > 0 ? trimmedReportName : 'Report';

  return formatScheduledReportMutationError(
    error,
    `${reportLabel} scheduling is temporarily unavailable. Please refresh and try again.`
  );
}

export function formatCustomReportMutationError(
  error: unknown,
  fallback: string
): string {
  return formatReportsMutationError(error, fallback, {
    codeMessages: CUSTOM_REPORT_CODE_MESSAGES,
  });
}
