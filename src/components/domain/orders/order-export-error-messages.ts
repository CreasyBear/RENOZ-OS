import { classifyReadFailureKind, type ReadFailureKind } from '@/lib/read-path-policy';

export const ORDER_EXPORT_FAILED_MESSAGE =
  'Order export is temporarily unavailable. Please refresh and try again.';

const ORDER_EXPORT_FAILURE_MESSAGES: Partial<Record<ReadFailureKind, string>> = {
  unauthorized: 'Your session has expired. Sign in again before exporting orders.',
  forbidden: 'You do not have permission to export orders.',
  validation: 'Order export filters could not be applied. Check the filters and try again.',
  'rate-limited': 'Too many order exports were attempted. Wait a moment and retry.',
};

export function formatOrderExportError(error: unknown): string {
  return ORDER_EXPORT_FAILURE_MESSAGES[classifyReadFailureKind(error)] ?? ORDER_EXPORT_FAILED_MESSAGE;
}
