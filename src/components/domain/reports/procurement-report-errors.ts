const PROCUREMENT_ANALYTICS_UNAVAILABLE =
  'Procurement analytics are temporarily unavailable. Please refresh and try again.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractMessage(error: unknown): string | null {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (!isRecord(error)) {
    return null;
  }

  const message = error.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

function isUnsafeReadMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('database') ||
    normalized.includes('stack') ||
    normalized.includes('sql syntax') ||
    normalized.includes('internal server error')
  );
}

export function formatProcurementAnalyticsReadError(error: unknown): string {
  const message = extractMessage(error);

  if (!message || isUnsafeReadMessage(message)) {
    return PROCUREMENT_ANALYTICS_UNAVAILABLE;
  }

  return message;
}
