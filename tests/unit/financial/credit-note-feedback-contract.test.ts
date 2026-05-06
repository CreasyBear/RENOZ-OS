import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatCreditNoteMutationError } from '@/hooks/financial/_mutation-errors';

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8');
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
    const list = read('src/components/domain/financial/credit-notes-list-container.tsx');
    const detail = read('src/components/domain/financial/credit-note-detail-container.tsx');

    expect(index).toContain('formatCreditNoteMutationError');
    expect(formatter).toContain('CREDIT_NOTE_CODE_MESSAGES');

    expect(list).toContain("formatCreditNoteMutationError(error, 'issue')");
    expect(list).toContain("formatCreditNoteMutationError(error, 'apply')");
    expect(list).toContain("formatCreditNoteMutationError(error, 'void')");
    expect(list).toContain("formatCreditNoteMutationError(error, 'pdf')");
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
