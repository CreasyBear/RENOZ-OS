import { isReadQueryError } from '@/lib/read-path-policy';

export const INVOICE_LIST_READ_FALLBACK_MESSAGE =
  'Invoices are temporarily unavailable. Please refresh and try again.';

export const INVOICE_PAYMENTS_READ_FALLBACK_MESSAGE =
  'Invoice payment history is temporarily unavailable. Please refresh and try again.';

function getInvoiceReadErrorMessage(error: unknown, fallbackMessage: string): string {
  if (isReadQueryError(error) && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

export function getInvoiceListReadErrorMessage(error: unknown): string {
  return getInvoiceReadErrorMessage(error, INVOICE_LIST_READ_FALLBACK_MESSAGE);
}

export function getInvoicePaymentsReadErrorMessage(error: unknown): string {
  return getInvoiceReadErrorMessage(error, INVOICE_PAYMENTS_READ_FALLBACK_MESSAGE);
}
