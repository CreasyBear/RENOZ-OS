export const WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE =
  'Certificate generation is temporarily unavailable. Please refresh and try again.';

const SAFE_CERTIFICATE_RESULT_MESSAGES = new Set(['Warranty not found']);

function extractMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }
  return null;
}

function isUnsafeCertificateResultMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('duplicate key') ||
    normalized.includes('violates') ||
    normalized.includes('constraint') ||
    normalized.includes('postgres') ||
    normalized.includes('supabase') ||
    normalized.includes('database') ||
    normalized.includes('storage') ||
    normalized.includes('bucket') ||
    normalized.includes('r2') ||
    normalized.includes('pdf') ||
    normalized.includes('stack') ||
    normalized.includes('internal server error')
  );
}

export function formatWarrantyCertificateResultError(
  error: unknown,
  fallback = WARRANTY_CERTIFICATE_GENERATION_FAILED_MESSAGE
): string {
  const message = extractMessage(error);
  if (!message) return fallback;

  if (SAFE_CERTIFICATE_RESULT_MESSAGES.has(message)) {
    return message;
  }

  if (isUnsafeCertificateResultMessage(message)) {
    return fallback;
  }

  return fallback;
}
