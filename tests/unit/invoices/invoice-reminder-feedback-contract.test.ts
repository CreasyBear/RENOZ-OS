import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatInvoiceMutationError } from '@/hooks/invoices/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('invoice reminder feedback contract', () => {
  it('formats invoice reminder failures without leaking infrastructure details', () => {
    expect(
      formatInvoiceMutationError(
        {
          statusCode: 500,
          message: 'Failed to send reminder email: Resend API key stack trace',
        },
        'sendReminder'
      )
    ).toBe('Unable to send invoice reminder. Refresh and try again.');

    expect(
      formatInvoiceMutationError(
        new Error('duplicate key value violates unique constraint email_history_pkey'),
        'sendReminder'
      )
    ).toBe('Unable to send invoice reminder. Refresh and try again.');
  });

  it('keeps safe invoice reminder workflow guidance', () => {
    expect(
      formatInvoiceMutationError(
        {
          statusCode: 400,
          message: 'Can only send reminders for unpaid or overdue invoices',
        },
        'sendReminder'
      )
    ).toBe('Can only send reminders for unpaid or overdue invoices');

    expect(
      formatInvoiceMutationError(
        {
          statusCode: 400,
          message: 'Customer has no email address',
        },
        'sendReminder'
      )
    ).toBe('Customer has no email address');
  });

  it('keeps reminder mutation feedback and permission on invoice-owned contracts', () => {
    const formatter = read('src/hooks/invoices/_mutation-errors.ts');
    const index = read('src/hooks/invoices/index.ts');
    const hook = read('src/hooks/invoices/use-send-invoice-reminder.ts');
    const server = read('src/server/functions/invoices/send-invoice-reminder.ts');

    expect(index).toContain('formatInvoiceMutationError');
    expect(formatter).toContain('sendReminder');
    expect(hook).toContain("formatInvoiceMutationError(error, 'sendReminder')");
    expect(hook).not.toContain("error.message || 'Failed to send reminder'");

    expect(server).toContain('withAuth({ permission: PERMISSIONS.financial.update })');
    expect(server).toContain('eq(orders.organizationId, organizationId)');
    expect(server).toContain('eq(customers.organizationId, organizationId)');
    expect(server).toContain('invoiceReminderSentAt: new Date()');
    expect(server).toContain('emailHistory');
  });
});
