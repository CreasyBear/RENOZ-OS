import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatCreditNoteMutationError } from '@/hooks/financial/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

function compact(value: string): string {
  return value.replace(/\s+/g, '');
}

describe('credit note mutation feedback contract', () => {
  it('formats credit note mutation failures without leaking infrastructure details', () => {
    expect(
      formatCreditNoteMutationError(
        {
          statusCode: 500,
          message: 'duplicate key value violates unique constraint credit_notes_number_key',
        },
        'issue'
      )
    ).toBe('Unable to issue credit note. Refresh and try again.');

    expect(
      formatCreditNoteMutationError(
        {
          statusCode: 500,
          message: 'duplicate key value violates unique constraint credit_notes_number_key',
        },
        'create'
      )
    ).toBe('Unable to create credit note. Refresh and try again.');

    expect(
      formatCreditNoteMutationError(
        {
          statusCode: 400,
          message: 'TypeError: Cannot read properties of undefined (reading creditNoteId)',
        },
        'apply'
      )
    ).toBe('Unable to apply credit note to invoice. Refresh and try again.');

    expect(
      formatCreditNoteMutationError(new Error('ReferenceError: pdfUrl is not defined'), 'pdf')
    ).toBe('Unable to generate credit note PDF. Refresh and try again.');
  });

  it('keeps known workflow guidance and code messages operator-safe', () => {
    expect(
      formatCreditNoteMutationError(
        {
          statusCode: 400,
          errors: {
            status: ['Only draft credit notes can be issued'],
          },
        },
        'issue'
      )
    ).toBe('Only draft credit notes can be issued');

    expect(
      formatCreditNoteMutationError({ statusCode: 409, code: 'CONFLICT' }, 'void')
    ).toBe('Credit note state changed. Refresh and review before trying again.');

    expect(
      formatCreditNoteMutationError({ statusCode: 403, code: 'PERMISSION_DENIED' }, 'apply')
    ).toBe('You do not have permission to manage credit notes.');
  });

  it('keeps list and detail credit note actions on the formatter boundary', () => {
    const index = read('src/hooks/financial/index.ts');
    const formatter = read('src/hooks/financial/_mutation-errors.ts');
    const hooks = read('src/hooks/financial/use-credit-notes.ts');
    const creditNoteCache = read('src/hooks/financial/_credit-note-cache.ts');
    const reportingCache = read('src/hooks/financial/_reporting-cache.ts');
    const route = read('src/routes/_authenticated/financial/credit-notes/index.tsx');
    const invoiceDetail = read('src/components/domain/invoices/detail/invoice-detail-container.tsx');
    const dialog = read('src/components/domain/financial/credit-note-dialogs.tsx');
    const compactDialog = compact(dialog);
    const list = read('src/components/domain/financial/credit-notes-list-container.tsx');
    const detail = read('src/components/domain/financial/credit-note-detail-container.tsx');

    expect(index).toContain('formatCreditNoteMutationError');
    expect(formatter).toContain('CREDIT_NOTE_CODE_MESSAGES');
    expect(hooks).toContain('invalidateCreditNoteQueries');
    expect(hooks).toContain("from './_credit-note-cache'");
    expect(creditNoteCache).toContain('queryKeys.financial.creditNotes()');
    expect(creditNoteCache).toContain('queryKeys.financial.creditNoteDetail(options.creditNoteId)');
    expect(creditNoteCache).toContain('queryKeys.customers.detail(options.customerId)');
    expect(creditNoteCache).toContain('queryKeys.orders.detail(orderId)');
    expect(creditNoteCache).toContain('queryKeys.orders.lists()');
    expect(creditNoteCache).toContain('queryKeys.orders.infiniteLists()');
    expect(creditNoteCache).toContain('queryKeys.invoices.detail(orderId)');
    expect(creditNoteCache).toContain('queryKeys.invoices.lists()');
    expect(creditNoteCache).toContain('queryKeys.invoices.summary()');
    expect(hooks).toContain('appliedOrderId: result.appliedToOrderId ?? data.orderId');
    expect(creditNoteCache).toContain('refreshReporting?: boolean');
    expect(creditNoteCache).toContain('if (options.refreshReporting)');
    expect(creditNoteCache).toContain('invalidateOrderBalanceReportingQueries(queryClient)');
    expect(hooks).toContain('refreshReporting: true');
    expect(reportingCache).toContain('invalidateOrderBalanceReportingQueries');
    expect(reportingCache).toContain('queryKeys.financial.arAging()');
    expect(reportingCache).toContain('queryKeys.financial.dashboard()');
    expect(reportingCache).toContain('queryKeys.financial.outstandingInvoices()');
    expect(reportingCache).toContain('queryKeys.financial.topCustomers()');
    expect(reportingCache).toContain('queryKeys.financial.reminderCandidates()');

    expect(route).toContain("formatCreditNoteMutationError(error, 'create')");
    expect(route).not.toContain("error.message || 'Failed to create credit note'");

    expect(invoiceDetail).toContain("formatCreditNoteMutationError(error, 'create')");
    expect(invoiceDetail).not.toContain("error.message || 'Failed to create credit note'");

    expect(dialog).toContain('const resetForm = useCallback(() => {');
    expect(compactDialog).toContain('onCreate({customerId:selectedCustomer.id,orderId:selectedOrder?.id||undefined,amount:amountNum,');
    expect(compactDialog).not.toContain('onCreate({customerId:selectedCustomer.id,orderId:selectedOrder?.id||undefined,amount:amountNum,reason:reason.trim(),});handleClose(false);');

    expect(list).toContain("formatCreditNoteMutationError(error, 'issue')");
    expect(list).toContain("formatCreditNoteMutationError(error, 'apply')");
    expect(list).toContain("formatCreditNoteMutationError(error, 'void')");
    expect(list).toContain("formatCreditNoteMutationError(error, 'pdf')");
    expect(list).not.toContain('queryClient.invalidateQueries');
    expect(list).not.toContain('queryKeys.financial.creditNotes()');
    expect(list).not.toContain("error.message || 'Failed to issue credit note'");
    expect(list).not.toContain("error.message || 'Failed to apply credit note'");
    expect(list).not.toContain("error.message || 'Failed to void credit note'");
    expect(list).not.toContain("error.message || 'Failed to generate PDF'");

    expect(detail).toContain("formatCreditNoteMutationError(err, 'issue')");
    expect(detail).toContain("formatCreditNoteMutationError(err, 'apply')");
    expect(detail).toContain("formatCreditNoteMutationError(err, 'void')");
    expect(detail).not.toContain("err.message || 'Failed to issue credit note'");
    expect(detail).not.toContain("err.message || 'Failed to apply credit note'");
    expect(detail).not.toContain("err.message || 'Failed to void credit note'");
  });
});
