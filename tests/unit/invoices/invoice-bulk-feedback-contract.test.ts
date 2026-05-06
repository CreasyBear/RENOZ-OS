import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatInvoiceMutationError } from '@/hooks/invoices/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('bulk invoice operation feedback contract', () => {
  it('formats bulk-level invoice failures without leaking infrastructure details', () => {
    expect(
      formatInvoiceMutationError(
        new Error('ReferenceError: selectedInvoices is not defined'),
        'bulkSendReminders'
      )
    ).toBe('Unable to send invoice reminders. Refresh and try again.');

    expect(
      formatInvoiceMutationError(
        {
          statusCode: 500,
          message: 'postgres database stack leaked while updating invoice status',
        },
        'bulkUpdateStatus'
      )
    ).toBe('Unable to update invoice statuses. Refresh and review before trying again.');
  });

  it('keeps per-invoice batch failures sanitized for future result display', () => {
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
          message: 'Invalid status transition from "draft" to "overdue"',
        },
        'updateStatus'
      )
    ).toBe('Invalid status transition from "draft" to "overdue"');
  });

  it('keeps bulk hook and dialog feedback on invoice-owned contracts', () => {
    const hook = read('src/hooks/invoices/use-bulk-invoice-operations.ts');
    const dialog = read('src/components/domain/invoices/bulk/invoice-bulk-operations-dialog.tsx');
    const list = read('src/components/domain/invoices/list/invoice-list-container.tsx');
    const reminderServer = read('src/server/functions/invoices/send-invoice-reminder.ts');
    const statusServer = read('src/server/functions/invoices/update-invoice-status.ts');

    expect(hook).toContain("formatInvoiceMutationError(error, 'sendReminder')");
    expect(hook).toContain("formatInvoiceMutationError(error, 'updateStatus')");
    expect(hook).toContain("formatInvoiceMutationError(error, 'bulkSendReminders')");
    expect(hook).toContain("formatInvoiceMutationError(error, 'bulkUpdateStatus')");
    expect(hook).toContain('queryKeys.invoices.lists()');
    expect(hook).toContain('queryKeys.invoices.summary()');
    expect(hook).toContain('queryKeys.invoices.detail(id)');
    expect(hook).not.toContain("error instanceof Error ? error.message : 'Unknown error'");
    expect(hook).not.toContain("error.message || 'Failed to send reminders'");
    expect(hook).not.toContain("error.message || 'Failed to update invoice statuses'");

    expect(dialog).not.toContain("toastError(error instanceof Error ? error.message");
    expect(dialog).not.toContain('Failed to complete bulk operation');
    expect(list).toContain("Don't toast here - useBulkSendReminders/useBulkUpdateInvoiceStatus onError already toasts");

    expect(reminderServer).toContain('withAuth({ permission: PERMISSIONS.financial.update })');
    expect(statusServer).toContain('withAuth({ permission: PERMISSIONS.financial.update })');
  });
});
