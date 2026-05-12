import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  INVOICE_LIST_READ_FALLBACK_MESSAGE,
  INVOICE_PAYMENTS_READ_FALLBACK_MESSAGE,
  getInvoiceListReadErrorMessage,
  getInvoicePaymentsReadErrorMessage,
} from '@/components/domain/invoices/invoice-read-error-messages';
import { normalizeReadQueryError } from '@/lib/read-path-policy';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('invoice read feedback contract', () => {
  it('formats invoice read failures without leaking unsafe internals', () => {
    const normalizedListFailure = normalizeReadQueryError(
      {
        statusCode: 503,
        code: 'INTERNAL_ERROR',
        message: 'select from invoices violates row level security policy',
      },
      {
        contractType: 'always-shaped',
        fallbackMessage: INVOICE_LIST_READ_FALLBACK_MESSAGE,
      }
    );

    expect(getInvoiceListReadErrorMessage(normalizedListFailure)).toBe(
      INVOICE_LIST_READ_FALLBACK_MESSAGE
    );
    expect(
      getInvoiceListReadErrorMessage(
        new Error('duplicate key violates invoices_org_number_idx postgres stack')
      )
    ).toBe(INVOICE_LIST_READ_FALLBACK_MESSAGE);
    expect(
      getInvoicePaymentsReadErrorMessage(
        new Error('select from order_payments violates row level security policy')
      )
    ).toBe(INVOICE_PAYMENTS_READ_FALLBACK_MESSAGE);
  });

  it('keeps invoice list and payment history behind the read helper', () => {
    const listContainer = read(
      'src/components/domain/invoices/list/invoice-list-container.tsx'
    );
    const detailView = read('src/components/domain/invoices/detail/invoice-detail-view.tsx');
    const invoiceHooks = read('src/hooks/invoices/use-invoices.ts');

    expect(invoiceHooks).toContain(
      "fallbackMessage: 'Invoices are temporarily unavailable. Please refresh and try again.'"
    );
    expect(listContainer).toContain(
      "import { getInvoiceListReadErrorMessage } from '../invoice-read-error-messages';"
    );
    expect(listContainer).toContain(
      'message={getInvoiceListReadErrorMessage(invoicesError)}'
    );
    expect(listContainer).not.toContain('invoicesError.message ||');
    expect(listContainer).not.toContain('There was an error loading the invoice list');

    expect(detailView).toContain(
      "import { getInvoicePaymentsReadErrorMessage } from '../invoice-read-error-messages';"
    );
    expect(detailView).toContain('getInvoicePaymentsReadErrorMessage(paymentsError)');
    expect(detailView).not.toContain('{paymentsError.message}');
  });
});
