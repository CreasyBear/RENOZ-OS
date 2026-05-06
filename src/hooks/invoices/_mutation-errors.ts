import { formatMutationError } from '@/lib/mutation-error-feedback';

const INVOICE_FALLBACKS = {
  generatePdf: 'Unable to generate invoice PDF. Refresh and try again.',
  void: 'Unable to void invoice. Refresh and review before trying again.',
} as const;

const INVOICE_CODE_MESSAGES: Record<string, string> = {
  NOT_FOUND: 'The invoice could not be found. Refresh and try again.',
  PERMISSION_DENIED: 'You do not have permission to manage invoices.',
  AUTH_ERROR: 'Your session has expired. Sign in again before managing invoices.',
  RATE_LIMIT: 'Too many invoice actions were attempted. Wait a moment and retry.',
  CONFLICT: 'Invoice state changed. Refresh and review before trying again.',
};

export type InvoiceMutationAction = keyof typeof INVOICE_FALLBACKS;

export function formatInvoiceMutationError(
  error: unknown,
  action: InvoiceMutationAction
): string {
  return formatMutationError(error, INVOICE_FALLBACKS[action], {
    codeMessages: INVOICE_CODE_MESSAGES,
  });
}
