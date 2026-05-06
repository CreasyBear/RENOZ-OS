import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatInvoiceMutationError } from '@/hooks/invoices/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('invoice status mutation feedback contract', () => {
  it('formats status mutation failures without leaking infrastructure details', () => {
    expect(
      formatInvoiceMutationError(
        {
          statusCode: 500,
          message: 'duplicate key value violates unique constraint orders_invoice_status_idx',
        },
        'updateStatus'
      )
    ).toBe('Unable to update invoice status. Refresh and review before trying again.');

    expect(
      formatInvoiceMutationError(
        new Error('TypeError: Cannot read properties of undefined (reading invoiceStatus)'),
        'updateStatus'
      )
    ).toBe('Unable to update invoice status. Refresh and review before trying again.');
  });

  it('keeps safe invoice workflow guidance for status changes', () => {
    expect(
      formatInvoiceMutationError(
        {
          statusCode: 400,
          message: 'Paid invoices must be created by recording a real payment, refund, or credit note.',
        },
        'updateStatus'
      )
    ).toBe('Paid invoices must be created by recording a real payment, refund, or credit note.');

    expect(
      formatInvoiceMutationError(
        {
          statusCode: 400,
          message: 'Invalid status transition from "draft" to "overdue"',
        },
        'updateStatus'
      )
    ).toBe('Invalid status transition from "draft" to "overdue"');
  });

  it('keeps status mutation feedback, cache, and permission on invoice contracts', () => {
    const formatter = read('src/hooks/invoices/_mutation-errors.ts');
    const hook = read('src/hooks/invoices/use-update-invoice-status.ts');
    const server = read('src/server/functions/invoices/update-invoice-status.ts');

    expect(formatter).toContain('updateStatus');
    expect(hook).toContain("formatInvoiceMutationError(error, 'updateStatus')");
    expect(hook).toContain('queryKeys.invoices.lists()');
    expect(hook).toContain('queryKeys.invoices.detail(result.invoiceId)');
    expect(hook).toContain('queryKeys.invoices.summary()');

    expect(server).toContain('withAuth({ permission: PERMISSIONS.financial.update })');
    expect(server).toContain('eq(orders.organizationId, organizationId)');
    expect(server).toContain('isValidInvoiceStatusTransition(currentStatus, newStatus)');
    expect(server).toContain('Paid invoices must be created by recording a real payment');
    expect(server).toContain('invoiceStatus: newStatus');
  });
});
