import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatInvoiceMutationError } from '@/hooks/invoices/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('invoice detail mutation feedback contract', () => {
  it('formats invoice mutation failures without leaking infrastructure details', () => {
    expect(
      formatInvoiceMutationError(
        {
          statusCode: 500,
          message: 'duplicate key value violates unique constraint generated_documents_pkey',
        },
        'generatePdf'
      )
    ).toBe('Unable to generate invoice PDF. Refresh and try again.');

    expect(
      formatInvoiceMutationError(
        new Error('TypeError: Cannot read properties of undefined (reading invoiceStatus)'),
        'void'
      )
    ).toBe('Unable to void invoice. Refresh and review before trying again.');
  });

  it('keeps safe invoice workflow guidance and code messages', () => {
    expect(
      formatInvoiceMutationError(
        {
          statusCode: 400,
          message:
            "Cannot void invoice in 'paid' status. Only unpaid or overdue invoices can be voided.",
        },
        'void'
      )
    ).toBe("Cannot void invoice in 'paid' status. Only unpaid or overdue invoices can be voided.");

    expect(
      formatInvoiceMutationError({ statusCode: 403, code: 'PERMISSION_DENIED' }, 'void')
    ).toBe('You do not have permission to manage invoices.');
  });

  it('keeps invoice detail document and void actions on invoice-owned feedback', () => {
    const detail = read('src/components/domain/invoices/detail/invoice-detail-container.tsx');
    const index = read('src/hooks/invoices/index.ts');
    const formatter = read('src/hooks/invoices/_mutation-errors.ts');
    const hook = read('src/hooks/invoices/use-invoices.ts');
    const server = read('src/server/functions/invoices/void-invoice.ts');
    const documentHook = read('src/hooks/documents/use-generate-order-documents.ts');

    expect(index).toContain('formatInvoiceMutationError');
    expect(formatter).toContain('INVOICE_CODE_MESSAGES');
    expect(detail).toContain("formatInvoiceMutationError(error, 'generatePdf')");
    expect(detail).toContain("formatInvoiceMutationError(error, 'void')");
    expect(detail).not.toContain("error.message || 'Failed to generate PDF'");
    expect(detail).not.toContain("error.message || 'Failed to void invoice'");

    expect(documentHook).toContain('useGenerateOrderInvoice');
    expect(documentHook).toContain("documentType: 'invoice'");
    expect(hook).toContain('useVoidInvoice');
    expect(hook).toContain('queryKeys.invoices.detail(result.invoiceId)');
    expect(hook).toContain('queryKeys.invoices.lists()');
    expect(server).toContain('withAuth({ permission: PERMISSIONS.order.delete })');
    expect(server).toContain('eq(orders.organizationId, organizationId)');
    expect(server).toContain("invoiceStatus: 'canceled'");
  });
});
